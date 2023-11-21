package main

import (
	"encoding/json"
	"fmt"
)

type Matrix struct {
	Rows, Cols uint32
	Array      [][]uint32
}

func Create(rows uint32, cols uint32) (*Matrix, error) {
	if rows == 0 || cols == 0 {
		return nil, fmt.Errorf("invalid matric dimensions")
	}

	var m Matrix
	m.Rows = rows
	m.Cols = cols
	m.Array = make([][]uint32, rows)
	var row uint32
	for row = 0; row < rows; row += 1 {
		m.Array[row] = make([]uint32, cols)
	}
	return &m, nil
}

func (m *Matrix) Get(row, col uint32) uint32 {
	return m.Array[row][col]
}

func (m *Matrix) GetPosition(p *Position) uint32 {
	return m.Get(p.Y, p.X)
}

func (m *Matrix) Set(row, col, value uint32) {
	m.Array[row][col] = value
}

func (m *Matrix) SetPosition(p *Position, value uint32) {
	m.Set(p.Y, p.X, value)
}

func (m *Matrix) Marshal() ([]byte, error) {
	return json.Marshal(m.Array)
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
