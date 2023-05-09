export enum MapTileTypes {
  EMPTY = 'EMPTY',
  WALL = 'WALL',
  DOOR = 'DOOR'
};

export enum Direction {
  UP = 'UP',
  RIGHT = 'RIGHT',
  DOWN = 'DOWN',
  LEFT = 'LEFT'
};

export enum UpdateType {
  MOVE = 'MOVE',
  INTERACT = 'INTERACT',
};

export interface MapTile {
  id: string,
  type: MapTileTypes,
  canBeSteppedOn: boolean,
  canBeInteractedWith: boolean
};

export interface Position {
  x: number,
  y: number,
};

export interface UserTile {
  id: string, // socket id
  name: string,
  color: string,
  position: Position,
  direction: Direction,
};

export interface MapData {
  data: MapTile[][],
  mapHeight: number,
  mapWidth: number
};

export interface UserData {
  userTiles: UserTile[],
  timestamp: number
};

export const MAP_INIT_EVENT = 'map_init'; // send MapData (to new player)
export const DATA_UPDATE_EVENT = 'data_update'; // main event used by the server to share user data updates (to all users)
export const USER_JOIN_EVENT = 'user_join'; // new User joining, sends login data -> add User & send DATA_UPDATE_EVENT
export const USER_LEAVE_EVENT = 'disconnect'; // remove from UserData -> send DATA_UPDATE_EVENT
export const USER_UPDATE_EVENT = 'user_update'; // user moves or interacts -> send DATA_UPDATE_EVENT if valid
export const USER_MESSAGE_EVENT = 'user_message';
export const MESSAGE_EVENT = 'message';
export const ERROR = 'error'; // user moves or interacts -> send DATA_UPDATE_EVENT if valid

// TODO(hschupp): add more data required upon login in
export interface LoginData {
  name: string,
  color: string
};

export interface BaseUpdate {
  type: UpdateType,
  timestamp: number
};

export interface MoveUpdate extends BaseUpdate {
  direction: Direction
};

export interface InteractUpdate extends BaseUpdate {
  target: Position,
};

export type UserUpdate = MoveUpdate | InteractUpdate;

export interface Message {
  senderId: string,
  senderName: string,
  timestamp: number,
  content: string
};