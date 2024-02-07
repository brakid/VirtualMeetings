export type Tile = {
  layer1Id: string;
  layer2Id: string;
  canEnter: boolean;
  canInteract: boolean;
};

export type TileMap = {
  tileset: string;
  rows: number;
  cols: number;
  array: Tile[][];
};

export type Direction = "up" | "down" | "left" | "right";

export type Position = {
  x: number;
  y: number;
};

export type UserPosition = {
  position: Position;
  direction: Direction;
};

export type Users = Map<string, UserPosition>;

export type Update = {
  positions: Map<string, UserPosition>;
  nonce: number;
};

export type UserUpdate = {
  direction: Direction;
  nonce: number;
};

export type UserInteraction = {
  nonce: number;
};

export type Interaction = {
  message: string;
  nonce: number;
};

export type OtherUserInteraction = {
  userId: string;
  nonce: number;
};

export type InteractionCallback = (interaction: Interaction) => void;