import { TileMap, Users } from './types';

export const TILE_SIZE = 32;

const userColorMap = new Map<number, string>([
  [0, 'red'],
  [1, 'green'],
  [2, 'blue'],
  [3, 'yellow'],
  [4, 'white'],
  [5, 'gray'],
  [6, 'brown'],
  [7, 'orange'],
  [8, 'maroon'],
  [9, 'violet'],
]);

const tileIdToTile = (tileId: string) => {
  const id = parseInt(tileId);
  const row = Math.floor(id / 16);
  const col = id % 16;

  return [row, col];
}

export const render = (tilesetImage: HTMLImageElement, tileMap: TileMap, users: Users, context: CanvasRenderingContext2D) => {
  context.clearRect(0, 0, TILE_SIZE * tileMap.cols, TILE_SIZE * tileMap.rows);
  tileMap.array.forEach((row, rowIndex) => {
    row.forEach((col, colIndex) => {
      const [tileRow, tileCol] = tileIdToTile(col.layer1Id);
      context.drawImage(tilesetImage, (tileCol * TILE_SIZE), (tileRow * TILE_SIZE), TILE_SIZE, TILE_SIZE, (colIndex * TILE_SIZE), (rowIndex * TILE_SIZE), TILE_SIZE, TILE_SIZE);
    })
  });

  tileMap.array.forEach((row, rowIndex) => {
    row.forEach((col, colIndex) => {
      const [tileRow, tileCol] = tileIdToTile(col.layer2Id);
      context.drawImage(tilesetImage, (tileCol * TILE_SIZE), (tileRow * TILE_SIZE), TILE_SIZE, TILE_SIZE, (colIndex * TILE_SIZE), (rowIndex * TILE_SIZE), TILE_SIZE, TILE_SIZE);
    })
  });

  Object.entries(users).forEach(([k, v]) => {
    const { x, y } = v.position;
    const direction = v.direction;
    context.fillStyle = userColorMap.get(parseInt(k))!;
    context.beginPath();
    if (direction == 'up') {
      context.arc(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 2, 1.75 * Math.PI, 1.25 * Math.PI);
    } else if (direction == 'down') {
      context.arc(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 2, 0.75 * Math.PI, 0.25 * Math.PI);
    } else if (direction == 'left') {
      context.arc(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 2, 1.25 * Math.PI, 0.75 * Math.PI);
    } else if (direction == 'right') {
      context.arc(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 2, 0.25 * Math.PI, 1.75 * Math.PI);
    }

    context.closePath();
    context.fill();
    context.stroke();
  });
};