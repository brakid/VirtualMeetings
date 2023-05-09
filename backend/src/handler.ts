import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { DATA_UPDATE_EVENT, Direction, InteractUpdate, LoginData, MAP_INIT_EVENT, MESSAGE_EVENT, MapData, MapTile, MapTileTypes, Message, MoveUpdate, Position, UpdateType, UserData, UserTile, UserUpdate } from "./types";
import { createMapTile, getNewPosition, positionToString, sendError, sendErrorAndDisconnect } from "./helper";
import { Mutex } from "async-mutex";

// events:
// 1. on connect: receive Map
// 2. on action: in: action type (move, interact with person/object), map version ID, out: updated map, send to all OR discard in case the version ID is not up to date
// 3. in disconnect: update map (remove user) & send to all

// data:
// 1. map data (array)
// JSON struct: what is this field (type, name & id), can be stepped on?, can be interacted with?
// 2. incremental map version ID (timestamp?)
// 3. interaction data (text sent to other) <- per person (or have this in a separate room?) -- ignore for now

// store state, receive updates, decide whether they are valid & apply & share results

const mapTiles = [
  [MapTileTypes.WALL, MapTileTypes.WALL, MapTileTypes.WALL, MapTileTypes.WALL, MapTileTypes.WALL, MapTileTypes.WALL, MapTileTypes.WALL],
  [MapTileTypes.WALL, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.WALL],
  [MapTileTypes.WALL, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.WALL],
  [MapTileTypes.WALL, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.WALL],
  [MapTileTypes.WALL, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.WALL],
  [MapTileTypes.WALL, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.EMPTY, MapTileTypes.WALL],
  [MapTileTypes.WALL, MapTileTypes.WALL, MapTileTypes.WALL, MapTileTypes.DOOR, MapTileTypes.WALL, MapTileTypes.WALL, MapTileTypes.WALL],
];
export const MAP = mapTiles.map(row => row.map(createMapTile));

class Users {
  users: Map<string, UserTile>;

  constructor() {
    this.users = new Map();
  }

  getUsers(): UserTile[] {
    return Array.from(this.users.values());
  }

  getUserById(id: string): UserTile | undefined {
    return this.users.get(id);
  }

  getUserByName(name: string): UserTile | undefined {
    const usersByName = new Map<string, UserTile>();
    for (const userTile of this.users.values()) {
      usersByName.set(userTile.name, userTile);
    }

    return usersByName.get(name);
  }

  addUser(user: UserTile): boolean {
    if (this.getUserById(user.id) || this.getUserByName(user.name)) {
      return false;
    }

    this.users.set(user.id, user);
    return true;
  }

  removeUser(id: string): boolean {
    return this.users.delete(id);
  }
}

class Messages {
  messages: Message[];

  constructor() {
    this.messages = [];
  }

  addMessage(message: Message): void {
    this.messages.push(message);
    if (this.messages.length > 100) {
      this.messages.shift();
    }
  }

  getMessages(): Message[] {
    return this.messages;
  }
}

export class Handler {
  io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
  users: Users;
  messages: Messages;
  internalId: number;
  mapData: MapData;
  mutex: Mutex;

  constructor(
      io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
      mapTiles: MapTile[][]) {
    this.io = io;
    this.users = new Users();
    this.messages = new Messages();
    this.mapData = {
      mapWidth: mapTiles[0].length,
      mapHeight: mapTiles.length,
      data: mapTiles
    };
    this.mutex = new Mutex();
    this.internalId = 0;
  }

  handleOnJoin(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, loginData: LoginData): void {
    socket.emit(MAP_INIT_EVENT, this.mapData);
    this.addUser(socket, loginData);
    this.sendMessages(socket);
  }

  handleOnLeave(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>): void {
    this.removeUser(socket);
  }

  handleUpdate(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, userUpdate: UserUpdate): void {
    switch(userUpdate.type) {
      case UpdateType.MOVE: return this.moveUser(socket, userUpdate as MoveUpdate);
      case UpdateType.INTERACT: return this.handleInteraction(socket, userUpdate as InteractUpdate);
    }
  }

  handleMessage(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, messageContent: string): void {
    const user = this.users.getUserById(socket.id);
      if (!!!user) {
        sendError(socket, 'User not found, ignoring update');
        return;
      }

    const message: Message = {
      senderId: socket.id,
      senderName: user.name,
      timestamp: new Date().getTime() / 1000,
      content: messageContent
    };

    this.messages.addMessage(message);

    this.broadcastMessages();
  }

  private addUser(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, loginData: LoginData): void {
    try {
      this.mutex.acquire();
      const position = this.findSpawnPosition();
      if (!!!position) {
        sendErrorAndDisconnect(socket, 'No available spawning position, rejecting client');
      }

      const newUser: UserTile = {
        position,
        id: socket.id,
        name: loginData.name,
        color: loginData.color,
        direction: Direction.DOWN
      };

      const successful = this.users.addUser(newUser);
      if (!successful) {
        sendErrorAndDisconnect(socket, 'Invalid user, rejecting client');
      }

      this.broadcastState();
    } finally {
      this.mutex.release();
    }
  }

  private removeUser(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>): void {
    try {
      this.mutex.acquire();
      
      this.users.removeUser(socket.id);

      this.broadcastState();
    } finally {
      this.mutex.release();
    }
  }

  handleInteraction(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, interactUpdate: InteractUpdate): void {
    console.log('Interaction');
  }

  private moveUser(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, moveUpdate: MoveUpdate): void {
    try {
      this.mutex.acquire();
      
      const user = this.users.getUserById(socket.id);
      if (!!!user) {
        sendError(socket, 'User not found, ignoring update');
        return;
      }

      if (moveUpdate.timestamp != this.internalId) {
        sendError(socket, 'Invalid timestamp, sending user updates');
        this.sendCurrentState(socket);
        return;
      }

      const currentPosition = user.position;
      const currentDirection = user.direction;

      if (currentDirection !== moveUpdate.direction) {
        user.direction = moveUpdate.direction;
      } else {
        const newPosition = getNewPosition(currentPosition, currentDirection);
        if (!this.isValidPosition(newPosition) || !this.isAdjacent(currentPosition, newPosition)) {
          sendError(socket, 'Invalid move, ignoring update');
          return;
        }
  
        user.position = newPosition;
      }

      this.broadcastState();
    } finally {
      this.mutex.release();
    }
  }

  private findSpawnPosition(): Position | undefined {
    // currently occupied positions by users
    const userPositions = new Set(this.users.getUsers().map(user => user.position).map(positionToString));

    // find free slot
    for (let y = 0; y < this.mapData.mapHeight; y++) {
      for (let x = 0; x < this.mapData.mapHeight; x++) {
        const position: Position = { x, y };
        if (!userPositions.has(positionToString(position)) && this.mapData.data[y][x].canBeSteppedOn) {
          return position;
        }
      }
    }

    return undefined;
  }

  private isValidPosition(position: Position): boolean {
    // currently occupied positions by users
    const userPositions = new Set(this.users.getUsers().map(user => user.position).map(positionToString));
    const { x, y } = position;
    // find free slot
    return x >= 0 && x < this.mapData.mapWidth && y >= 0 && y < this.mapData.mapHeight && !userPositions.has(positionToString(position)) && this.mapData.data[y][x].canBeSteppedOn;
  }

  private isAdjacent(position1, position2: Position): boolean {
    return Math.abs(position1.x - position2.x) + Math.abs(position1.y - position2.y) == 1;
  }

  private sendCurrentState(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>): void {
    socket.emit(DATA_UPDATE_EVENT, {
      timestamp: this.internalId,
      userTiles: this.users.getUsers()
    });
  }

  private sendMessages(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>): void {
    socket.emit(MESSAGE_EVENT, this.messages.getMessages());
  }

  private broadcastState(): void {
    // send updated user list
    const userData: UserData = {
      timestamp: this.internalId++,
      userTiles: this.users.getUsers()
    }
    this.io.emit(DATA_UPDATE_EVENT, userData);
  }

  private broadcastMessages(): void {
    this.io.emit(MESSAGE_EVENT, this.messages.getMessages());
  }
}