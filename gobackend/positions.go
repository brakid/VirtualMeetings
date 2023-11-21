package main

import (
	"fmt"
	"math/rand"

	"github.com/google/go-cmp/cmp"
)

func FindPosition(m *Matrix, u *map[string]*Position, attempts int) (*Position, error) {
	attempt := 1
	found := false
	var position *Position

	for (attempt < attempts) && !found {
		attempt += 1

		x := rand.Uint32() % m.Cols
		y := rand.Uint32() % m.Rows

		position = &Position{X: x, Y: y}

		if m.GetPosition(position) != 0 {
			continue
		}
		for _, pos := range *u {
			if cmp.Equal(*pos, *position) {
				continue
			}
		}

		found = true
	}

	if !found {
		return nil, fmt.Errorf("no position found")
	}
	return position, nil
}

func move(p *Position, d Direction) *Position {
	switch d {
	case UP:
		return &Position{X: p.X, Y: p.Y - 1}
	case DOWN:
		return &Position{X: p.X, Y: p.Y + 1}
	case LEFT:
		return &Position{X: p.X - 1, Y: p.Y}
	case RIGHT:
		return &Position{X: p.X + 1, Y: p.Y}
	}
	return nil
}

func Move(p *Position, d Direction, m *Matrix, u *map[string]*Position) (*Position, error) {
	newPosition := move(p, d)

	if int32(newPosition.X) < 0 || newPosition.X >= m.Cols {
		return nil, fmt.Errorf("invalid column/x")
	}

	if int32(newPosition.Y) < 0 || newPosition.Y >= m.Rows {
		return nil, fmt.Errorf("invalid row/y")
	}

	if m.GetPosition(newPosition) != 0 {
		return nil, fmt.Errorf("invalid position, blocked")
	}

	for _, pos := range *u {
		fmt.Printf("a: %v, b: %v\n", *pos, *newPosition)
		if cmp.Equal(*pos, *newPosition) {
			return nil, fmt.Errorf("invalid position, blocked by user")
		}
	}

	return newPosition, nil
}
