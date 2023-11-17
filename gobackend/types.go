package main

import (
	"encoding/json"
	"fmt"
)

type Matrix struct {
	array [][]uint32
}

func Create(rows uint32, cols uint32) (*Matrix, error) {
	if rows == 0 || cols == 0 {
		return nil, fmt.Errorf("invalid matric dimensions")
	}

	var m Matrix
	m.array = make([][]uint32, rows)
	var row uint32
	for row = 0; row < rows; row += 1 {
		m.array[row] = make([]uint32, cols)
	}
	return &m, nil
}

func (m *Matrix) Get(row, col uint32) uint32 {
	return m.array[row][col]
}

func (m *Matrix) Set(row, col, value uint32) {
	m.array[row][col] = value
}

func (m *Matrix) Marshal() ([]byte, error) {
	return json.Marshal(m.array)
}
