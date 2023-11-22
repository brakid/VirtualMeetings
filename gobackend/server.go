package main

import (
	"encoding/json"
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

	users := make(map[string]*Position)

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
		m, err := matrix.Marshal()
		if err != nil {
			return err
		}

		position, err := FindPosition(matrix, &users, 5)
		if err != nil {
			return err
		}
		users[s.ID()] = position

		u, err := json.Marshal(&users)
		if err != nil {
			return err
		}

		s.Emit("init", m)
		server.BroadcastToNamespace("/", "positions", u)
		return nil
	})

	server.OnEvent("/", "move", func(s socketio.Conn, msg string) error {
		direction := Direction(msg)
		log.Printf("user %v moves: %v", s.ID(), direction)
		newPosition, err := Move(users[s.ID()], direction, matrix, &users)
		if err != nil {
			s.Emit("ack", false)
			return err
		}

		users[s.ID()] = newPosition

		u, err := json.Marshal(&users)
		if err != nil {
			return err
		}

		s.Emit("ack", true)
		server.BroadcastToNamespace("/", "positions", u)
		return nil
	})

	server.OnError("/", func(s socketio.Conn, e error) {
		log.Println("meet error:", e)
	})

	server.OnDisconnect("/", func(s socketio.Conn, reason string, context map[string]interface{}) {
		log.Println("closed", s.ID(), reason)
		delete(users, s.ID())

		u, _ := json.Marshal(&users)
		server.BroadcastToNamespace("/", "positions", u)
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
