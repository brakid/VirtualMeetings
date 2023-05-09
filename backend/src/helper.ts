import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { Direction, ERROR, MapTile, MapTileTypes, Position } from "./types";
import { v4 as uuid } from "uuid";

export const createEmptyMapTile = (): MapTile => {
  return {
    id: uuid(),
    type: MapTileTypes.EMPTY,
    canBeSteppedOn: true,
    canBeInteractedWith: false,
  };
};

export const createWallMapTile = (): MapTile => {
  return {
    id: uuid(),
    type: MapTileTypes.WALL,
    canBeSteppedOn: false,
    canBeInteractedWith: false,
  };
};

export const createDoorMapTile = (): MapTile => {
  return {
    id: uuid(),
    type: MapTileTypes.DOOR,
    canBeSteppedOn: false,
    canBeInteractedWith: true,
  };
};

export const createMapTile = (type: MapTileTypes): MapTile => {
  switch (type) {
    case MapTileTypes.EMPTY: return createEmptyMapTile();
    case MapTileTypes.WALL: return createWallMapTile();
    case MapTileTypes.DOOR: return createDoorMapTile();
  }
};

export const sendErrorAndDisconnect = (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, errorMessage: string): void => {
  sendError(socket, errorMessage);
  socket.disconnect();
};

export const sendError = (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, errorMessage: string): void => {
  console.log(errorMessage);
  socket.emit(ERROR, errorMessage);
};

export const getNewPosition = (position: Position, direction: Direction): Position => {
  const { x, y } = position;
  switch(direction) {
    case Direction.UP: return { x, y: y-1 };
    case Direction.RIGHT: return { x: x+1, y: y };
    case Direction.DOWN: return { x, y: y+1 };
    case Direction.LEFT: return { x: x-1, y };
  }
};

export const positionToString = (position: Position): string => {
  return `${position.x}-${position.y}`;
};