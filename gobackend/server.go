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

func main() {
	tileMap, err := Create("default.png", 5, 5)
	if err != nil {
		log.Fatalf("Failed to instantiate the tile map: %v", err)
	}
	tileMap.Set(1, 1, &Tile{Layer1Id: "28", Layer2Id: "151", CanEnter: false, CanInteract: true})

	sockets := make(map[string]string)
	users := make(map[string]*UserPosition)
	nonce := uint64(0)

	server := socketio.NewServer(&engineio.Options{
		Transports: []transport.Transport{
			&polling.Transport{
				CheckOrigin: func(r *http.Request) bool {
					return true
				},
			},
			&websocket.Transport{
				CheckOrigin: func(r *http.Request) bool {
					return true
				},
			},
		},
	})

	server.OnConnect("/", func(s socketio.Conn, context map[string]interface{}) error {
		log.Println("connected:", s.ID())
		log.Println("context:", context)
		id := fmt.Sprintf("%v", context["token"])

		t, err := json.Marshal(tileMap)
		if err != nil {
			return err
		}

		position, err := FindPosition(tileMap, &users, 5)
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

		s.Emit("init", t)
		server.BroadcastToNamespace("/", "update", u)
		return nil
	})

	server.OnEvent("/", "move", func(s socketio.Conn, msg string) error {
		var userUpdate UserUpdate
		err := json.Unmarshal([]byte(msg), &userUpdate)
		if err != nil {
			s.Emit("ack", false)
			log.Printf("Unmarshal Error: %v", err)
			return err
		}
		if userUpdate.Nonce <= nonce {
			s.Emit("ack", false)
			log.Printf("Error: invalid nonce: %v vs %v", nonce, userUpdate.Nonce)
			return fmt.Errorf("invalid nonce: %v vs %v", nonce, userUpdate.Nonce)
		}
		id, ok := sockets[s.ID()]
		if !ok {
			s.Emit("ack", false)
			log.Printf("Error: invalid socket ID: %v", s.ID())
			return fmt.Errorf("invalid socket ID: %v", s.ID())
		}
		log.Printf("user %v moves: %v", id, userUpdate.Direction)
		newPosition, err := Move(id, userUpdate.Direction, tileMap, &users)
		if err != nil {
			s.Emit("ack", false)
			log.Printf("Move Error: %v", err)
			return err
		}

		nonce = userUpdate.Nonce
		users[id] = newPosition
		update := Update{Positions: &users, Nonce: nonce}

		u, err := json.Marshal(update)
		if err != nil {
			log.Printf("Marshal Error: %v", err)
			return err
		}

		s.Emit("ack", true)
		server.BroadcastToNamespace("/", "update", u)
		return nil
	})

	server.OnEvent("/", "interact", func(s socketio.Conn, msg string) error {
		var userInteraction UserInteraction
		err := json.Unmarshal([]byte(msg), &userInteraction)
		if err != nil {
			s.Emit("ack", false)
			log.Printf("Unmarshal Error: %v", err)
			return err
		}
		if userInteraction.Nonce <= nonce {
			s.Emit("ack", false)
			log.Printf("Error: invalid nonce: %v vs %v", nonce, userInteraction.Nonce)
			return fmt.Errorf("invalid nonce: %v vs %v", nonce, userInteraction.Nonce)
		}

		id, ok := sockets[s.ID()]
		if !ok {
			s.Emit("ack", false)
			log.Printf("Error: invalid socket ID: %v", s.ID())
			return fmt.Errorf("invalid socket ID: %v", s.ID())
		}

		positionFacing, err := PositionFacing(users[id], tileMap)
		if err != nil {
			s.Emit("ack", false)
			log.Printf("Error: invalid position facing: %v", positionFacing)
			return fmt.Errorf("invalid position facing: %v", positionFacing)
		}

		log.Printf("user %v interacts with position: %v", id, positionFacing)

		tile := tileMap.GetPosition(positionFacing)
		if tile == nil {
			s.Emit("ack", false)
			log.Printf("Error: invalid tile")
			return fmt.Errorf("invalid tile")
		}

		if !tile.CanInteract {
			s.Emit("ack", false)
			log.Printf("Error: not interactive")
			return fmt.Errorf("not interactive")
		}
		nonce = userInteraction.Nonce
		interaction := &Interaction{Message: "Turning on the TV", Nonce: nonce}

		i, err := json.Marshal(interaction)
		if err != nil {
			log.Printf("Marshal Error: %v", err)
			return err
		}

		otherUserInteraction := &OtherUserInteraction{UserId: id, Nonce: nonce}
		ui, err := json.Marshal(otherUserInteraction)
		if err != nil {
			log.Printf("Marshal Error: %v", err)
			return err
		}

		s.Emit("interaction", i)
		s.Emit("ack", true)
		server.BroadcastToNamespace("/", "userInteraction", ui)

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
