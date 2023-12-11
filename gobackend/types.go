package main

import (
	"fmt"
)

type Tile struct {
	Id          string `json:"id"`
	CanEnter    bool   `json:"canEnter"`
	CanInteract bool   `json:"canInteract"`
}

var EMPTY_TILE = &Tile{Id: "0", CanEnter: true, CanInteract: false}

type TileMap struct {
	Tileset string    `json:"tileset"`
	Rows    uint32    `json:"rows"`
	Cols    uint32    `json:"cols"`
	Array   [][]*Tile `json:"array"`
}

func Create(tileset string, rows uint32, cols uint32) (*TileMap, error) {
	if rows == 0 || cols == 0 {
		return nil, fmt.Errorf("invalid matric dimensions")
	}

	t := &TileMap{Tileset: tileset, Rows: rows, Cols: cols, Array: make([][]*Tile, rows)}
	var row uint32
	for row = 0; row < rows; row += 1 {
		t.Array[row] = make([]*Tile, cols)
		var col uint32
		for col = 0; col < cols; col += 1 {
			t.Array[row][col] = EMPTY_TILE
		}
	}
	return t, nil
}

func (t *TileMap) Get(row, col uint32) *Tile {
	return t.Array[row][col]
}

func (t *TileMap) GetPosition(p *Position) *Tile {
	return t.Get(p.Y, p.X)
}

func (t *TileMap) Set(row, col uint32, value *Tile) {
	t.Array[row][col] = value
}

func (t *TileMap) SetPosition(p *Position, value *Tile) {
	t.Set(p.Y, p.X, value)
}

type Direction string

const (
	UP    Direction = "up"
	DOWN  Direction = "down"
	LEFT  Direction = "left"
	RIGHT Direction = "right"
)

type Position struct {
	X uint32 `json:"x"`
	Y uint32 `json:"y"`
}

type Update struct {
	Positions *map[string]*Position `json:"positions"`
	Nonce     uint64                `json:"nonce"`
}

type UserUpdate struct {
	Direction Direction `json:"direction"`
	Nonce     uint64    `json:"nonce"`
}
