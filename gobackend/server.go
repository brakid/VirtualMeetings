package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	socketio "github.com/vchitai/go-socket.io/v4"
	"github.com/vchitai/go-socket.io/v4/engineio"
	"github.com/vchitai/go-socket.io/v4/engineio/transport"
	"github.com/vchitai/go-socket.io/v4/engineio/transport/polling"
	"github.com/vchitai/go-socket.io/v4/engineio/transport/websocket"
)

var allowOriginFunc = func(r *http.Request) bool {
	return true
}

func main() {
	matrix, err := Create(5, 5)
	if err != nil {
		log.Fatalf("Failed to instantiate the matrix: %v", err)
	}
	matrix.Set(1, 1, 4)

	sockets := make(map[string]string)
	users := make(map[string]*Position)
	nonce := uint64(0)

	server := socketio.NewServer(&engineio.Options{
		Transports: []transport.Transport{
			&polling.Transport{
				CheckOrigin: allowOriginFunc,
			},
			&websocket.Transport{
				CheckOrigin: allowOriginFunc,
			},
		},
	})

	server.OnConnect("/", func(s socketio.Conn, context map[string]interface{}) error {
		log.Println("connected:", s.ID())
		log.Println("context:", context)
		id := fmt.Sprintf("%v", context["token"])

		m, err := matrix.Marshal()
		if err != nil {
			return err
		}

		position, err := FindPosition(matrix, &users, 5)
		if err != nil {
			return err
		}
		if _, ok := users[id]; ok {
			return fmt.Errorf("user id is already taken: %v", id)
		}
		sockets[s.ID()] = id
		users[id] = position
		nonce += 1
		update := Update{Positions: &users, Nonce: nonce}

		u, err := json.Marshal(update)
		if err != nil {
			return err
		}

		s.Emit("init", m)
		server.BroadcastToNamespace("/", "update", u)
		return nil
	})

	server.OnEvent("/", "move", func(s socketio.Conn, msg string) error {
		var userUpdate UserUpdate
		err := json.Unmarshal([]byte(msg), &userUpdate)
		if err != nil {
			s.Emit("ack", false)
			return err
		}
		if userUpdate.Nonce <= nonce {
			s.Emit("ack", false)
			return fmt.Errorf("invalid nonce: %v vs %v", nonce, userUpdate.Nonce)
		}
		nonce = userUpdate.Nonce
		id, ok := sockets[s.ID()]
		if !ok {
			s.Emit("ack", false)
			return fmt.Errorf("invalid socket ID: %v", s.ID())
		}
		log.Printf("user %v moves: %v", id, userUpdate.Direction)
		newPosition, err := Move(users[id], userUpdate.Direction, matrix, &users)
		if err != nil {
			s.Emit("ack", false)
			return err
		}

		users[id] = newPosition
		update := Update{Positions: &users, Nonce: nonce}

		u, err := json.Marshal(update)
		if err != nil {
			return err
		}

		s.Emit("ack", true)
		server.BroadcastToNamespace("/", "update", u)
		return nil
	})

	server.OnError("/", func(s socketio.Conn, e error) {
		log.Println("meet error:", e)
	})

	server.OnDisconnect("/", func(s socketio.Conn, reason string, context map[string]interface{}) {
		log.Println("closed", s.ID(), reason)
		id := sockets[s.ID()]
		delete(users, id)
		delete(sockets, s.ID())
		nonce += 1

		update := Update{Positions: &users, Nonce: nonce}

		u, _ := json.Marshal(update)
		server.BroadcastToNamespace("/", "update", u)
	})

	go func() {
		if err := server.Serve(); err != nil {
			log.Fatalf("socketio listen error: %s\n", err)
		}
	}()
	defer server.Close()

	http.Handle("/socket.io/", server)
	http.Handle("/", http.FileServer(http.Dir("./asset")))

	log.Println("Serving at localhost:8000...")
	log.Fatal(http.ListenAndServe(":8000", nil))
}
