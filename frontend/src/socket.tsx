import { signal } from "@preact/signals-react";
import { Socket, io } from "socket.io-client";

type Tile = {
  layer1Id: string;
  layer2Id: string;
  canEnter: boolean;
  canInteract: boolean;
};

type TileMap = {
  tileset: string;
  rows: number;
  cols: number;
  array: Tile[][];
};

type Direction = "up" | "down" | "left" | "right";

type Position = {
	x: number;
  y : number;
};

type UserPosition = {
	position: Position;
	direction: Direction;
};

type Users = Map<string, UserPosition>;

type Update = {
	positions: Map<string, UserPosition>;
	nonce: number;
};

type UserUpdate = {
	direction: Direction;
	nonce: number;
};

type UserInteraction = {
	nonce: number;
};

type Interaction = {
	message: string;
  nonce: number;
};

type OtherUserInteraction = {
	userId: string;
	nonce: number;
};

type InteractionCallback = (interaction: Interaction) => void;

class EnrichedSocket {
  private socket: Socket;
  private interactionCallbacks: InteractionCallback[];

  constructor(socket: Socket) {
    this.socket = socket;
    this.interactionCallbacks = [];
  }

  addCallback(callback: InteractionCallback) {
    this.interactionCallbacks.push(callback);
  }

  move(direction: Direction) {
    console.log('Move: ' + direction);
    this.socket.emit('move', JSON.stringify({ direction, nonce: nonce.value + 1 } as UserUpdate));
  }
  
  interact() {
    console.log('Interact');
    this.socket.emit('interact', JSON.stringify({ nonce: nonce.value + 1 } as UserInteraction));
  }
}

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
const id = Math.floor(Math.random() * 10) + '';

const backendUrl = 'http://localhost:8000';
export const context = signal<CanvasRenderingContext2D | undefined>(undefined);

const tileMap = signal<TileMap | undefined>(undefined);
const users = signal<Users>(new Map());
export const nonce = signal(-1);
const tilesetImage = signal<HTMLImageElement | undefined>(undefined);
const tileSize = 32;

const createEnrichedSocket = (backendUrl: string, id: string): EnrichedSocket => {
  const socket = io(backendUrl, { auth: { token: id } });

  const enrichedSocket = new EnrichedSocket(socket);

  socket.on('update', async (updateString) => {
    const update = JSON.parse(atob(updateString)) as Update;
    console.log(update);
    users.value = update.positions;
    nonce.value = update.nonce;
    console.log('Update');
    
    render(tilesetImage.value, tileMap.value, users.value, context.value);
  });
  
  socket.on('init', async (mapString) => {
    tileMap.value = JSON.parse(atob(mapString)) as TileMap;
    console.log(tileMap);
  
    await loadImage(backendUrl + '/' + tileMap.value!.tileset);
    context.value!.canvas.width = tileSize * tileMap.value!.cols;
    context.value!.canvas.height =  tileSize * tileMap.value!.rows;
  
    render(tilesetImage.value, tileMap.value, users.value, context.value);
  });

  socket.on('disconnect', async () => {
    users.value = new Map();
    render(tilesetImage.value, tileMap.value, users.value, context.value);
  })
  
  socket.on('ack', async (ack) => {
    console.log('ack? ' + ack);
    if (!ack) {
      nonce.value += 1;
    }
  });
  
  socket.on('interaction', async (interactionString) => {
    const interaction = JSON.parse(atob(interactionString)) as Interaction;
    console.log('Interaction: ' + JSON.stringify(interaction));

    enrichedSocket.interactionCallbacks.forEach(callback => callback(interaction));

    nonce.value = interaction.nonce;
  
    render(tilesetImage.value, tileMap.value, users.value, context.value);
  });
  
  socket.on('userInteraction', async (userInteractionString) => {
    const userInteraction = JSON.parse(atob(userInteractionString)) as OtherUserInteraction;
    if (userInteraction.userId === id) {
      console.log('Ignoring own interaction');
    } else {
      console.log('Other user interaction: ' + JSON.stringify(userInteraction));
      nonce.value = userInteraction.nonce;
      
      render(tilesetImage.value, tileMap.value, users.value, context.value);
    }
  });

  return enrichedSocket;
};

export const enrichedSocket = signal<EnrichedSocket>(createEnrichedSocket(backendUrl, id));

const loadImage = (src: string) => {
  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      tilesetImage.value = img;
      resolve();
    };
    img.onerror = reject;
    img.src = src;
  });
};

const tileIdToTile = (tileId: string) => {
  const id = parseInt(tileId);
  const row = Math.floor(id / 16);
  const col = id % 16;

  return [row, col];
}

const render = (tilesetImage: HTMLImageElement | undefined, tileMap: TileMap | undefined, users: Users, context: CanvasRenderingContext2D | undefined) => {
  if (!tilesetImage || !tileMap || !context) {
    setTimeout(() => render(tilesetImage, tileMap, users, context), 500);
    return;
  }

  context.clearRect(0, 0, tileSize * tileMap.cols, tileSize * tileMap.rows);
  tileMap.array.forEach((row, rowIndex) => {
    row.forEach((col, colIndex) => {
      const [tileRow, tileCol] = tileIdToTile(col.layer1Id);
      context.drawImage(tilesetImage, (tileCol * tileSize), (tileRow * tileSize), tileSize, tileSize, (colIndex * tileSize), (rowIndex * tileSize), tileSize, tileSize); 
    })
  });

  tileMap.array.forEach((row, rowIndex) => {
    row.forEach((col, colIndex) => {
      const [tileRow, tileCol] = tileIdToTile(col.layer2Id);
      context.drawImage(tilesetImage, (tileCol * tileSize), (tileRow * tileSize), tileSize, tileSize, (colIndex * tileSize), (rowIndex * tileSize), tileSize, tileSize); 
    })
  });

  Object.entries(users).forEach(([k, v]) => {
    const { x, y } = v.position;
    const direction = v.direction;
    context.fillStyle = userColorMap.get(parseInt(k))!;
    context.beginPath();
    if (direction == 'up') {
      context.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize / 2, 1.75 * Math.PI, 1.25 * Math.PI);
    } else if (direction == 'down') {
      context.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize / 2, 0.75 * Math.PI, 0.25 * Math.PI);
    } else if (direction == 'left') {
      context.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize / 2, 1.25 * Math.PI, 0.75 * Math.PI);
    } else if (direction == 'right') {  
      context.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize / 2, 0.25 * Math.PI, 1.75 * Math.PI);
    }

    context.closePath();
    context.fill();
    context.stroke();
  });
};