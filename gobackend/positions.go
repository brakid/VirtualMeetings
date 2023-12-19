package main

import (
	"fmt"
	"math/rand"

	"github.com/google/go-cmp/cmp"
)

func FindPosition(t *TileMap, u *map[string]*UserPosition, attempts int) (*UserPosition, error) {
	attempt := 1
	found := false
	var position *Position

	for (attempt < attempts) && !found {
		attempt += 1

		x := rand.Uint32() % t.Cols
		y := rand.Uint32() % t.Rows

		position = &Position{X: x, Y: y}

		if !t.GetPosition(position).CanEnter {
			continue
		}
		for _, uPos := range *u {
			if cmp.Equal(*uPos.Position, *position) {
				continue
			}
		}

		found = true
	}

	if !found {
		return nil, fmt.Errorf("no position found")
	}
	return &UserPosition{Position: position, Direction: UP}, nil
}

func move(u *UserPosition, d Direction) *UserPosition {
	if u.Direction != d {
		return &UserPosition{Position: &Position{X: u.Position.X, Y: u.Position.Y}, Direction: d}
	}
	switch d {
	case UP:
		return &UserPosition{Position: &Position{X: u.Position.X, Y: u.Position.Y - 1}, Direction: UP}
	case DOWN:
		return &UserPosition{Position: &Position{X: u.Position.X, Y: u.Position.Y + 1}, Direction: DOWN}
	case LEFT:
		return &UserPosition{Position: &Position{X: u.Position.X - 1, Y: u.Position.Y}, Direction: LEFT}
	case RIGHT:
		return &UserPosition{Position: &Position{X: u.Position.X + 1, Y: u.Position.Y}, Direction: RIGHT}
	}
	return nil
}

func Move(id string, d Direction, t *TileMap, users *map[string]*UserPosition) (*UserPosition, error) {
	u := (*users)[id]
	newPosition := move(u, d)

	if int32(newPosition.Position.X) < 0 || newPosition.Position.X >= t.Cols {
		return nil, fmt.Errorf("invalid column/x")
	}

	if int32(newPosition.Position.Y) < 0 || newPosition.Position.Y >= t.Rows {
		return nil, fmt.Errorf("invalid row/y")
	}

	if !t.GetPosition(newPosition.Position).CanEnter {
		return nil, fmt.Errorf("invalid position, blocked")
	}

	for uid, uPos := range *users {
		fmt.Printf("a: %v %v %v, b: %v %v %v\n", id, uPos.Position, uPos.Direction, uid, newPosition.Position, newPosition.Direction)
		if uid != id && cmp.Equal(*uPos.Position, *newPosition.Position) {
			return nil, fmt.Errorf("invalid position, blocked by other user")
		}
	}

	return newPosition, nil
}
