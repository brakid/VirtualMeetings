import { Signal, signal } from '@preact/signals-react';
import { Socket, io } from 'socket.io-client';
import { InteractionCallback, TileMap, Users, Update, Interaction, OtherUserInteraction, Direction, UserUpdate, UserInteraction } from './types';
import { TILE_SIZE, render } from './render';

export const id = signal(Math.floor(Math.random() * 10) + '');

const BACKEND_URL = 'http://localhost:8000';

class EnrichedSocket {
  private socket: Socket;
  private interactionCallbacks: InteractionCallback[];
  private context?: CanvasRenderingContext2D;
  private tileMap?: TileMap;
  private users: Users;
  private nonce: Signal<number>;
  private tilesetImage?: HTMLImageElement;
  
  constructor(backendUrl: string, id: string) {
    this.interactionCallbacks = [];
    this.users = new Map();
    this.nonce = signal(-1);

    this.socket = io(backendUrl, { auth: { token: id } });

    this.socket.on('update', async (updateString) => {
      const update = JSON.parse(atob(updateString)) as Update;
      console.log(update);
      this.users = update.positions;
      this.nonce.value = update.nonce;
      console.log('Update');
      
      this.render();
    });
    
    this.socket.on('init', async (mapString) => {
      this.tileMap = JSON.parse(atob(mapString)) as TileMap;
      console.log(this.tileMap);
    
      await this.loadImage(backendUrl + '/' + this.tileMap!.tileset);
      this.context!.canvas.width = TILE_SIZE * this.tileMap!.cols;
      this.context!.canvas.height = TILE_SIZE * this.tileMap!.rows;
    
      this.render();
    });

    this.socket.on('disconnect', async () => {
      this.users = new Map();
      this.render();
    })
    
    this.socket.on('ack', async (ack) => {
      console.log('ack? ' + ack);
      if (!ack) {
        this.nonce.value += 1;
      }
    });
    
    this.socket.on('interaction', async (interactionString) => {
      const interaction = JSON.parse(atob(interactionString)) as Interaction;
      console.log('Interaction: ' + JSON.stringify(interaction));

      this.interactionCallbacks.forEach(callback => callback(interaction));

      this.nonce.value = interaction.nonce;
    
      this.render();
    });
    
    this.socket.on('userInteraction', async (userInteractionString) => {
      const userInteraction = JSON.parse(atob(userInteractionString)) as OtherUserInteraction;
      if (userInteraction.userId === id) {
        console.log('Ignoring own interaction');
      } else {
        console.log('Other user interaction: ' + JSON.stringify(userInteraction));
        this.nonce.value = userInteraction.nonce;
        
        this.render();
      }
    });
  }

  setContext(context: CanvasRenderingContext2D) {
    this.context = context;
  }

  getContext(): CanvasRenderingContext2D | undefined {
    return this.context;
  }

  render() {
    if (!this.tilesetImage || !this.tileMap || !this.context) {
      setTimeout(() => this.render(), 500);
      return;
    }
    render(this.tilesetImage, this.tileMap, this.users, this.context)
  }

  private loadImage(src: string) {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.tilesetImage = img;
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  getNonce() {
    return this.nonce;
  }

  addCallback(callback: InteractionCallback) {
    this.interactionCallbacks.push(callback);
  }

  move(direction: Direction) {
    console.log('Move: ' + direction);
    this.socket.emit('move', JSON.stringify({ direction, nonce: this.nonce.value + 1 } as UserUpdate));
  }
  
  interact() {
    console.log('Interact');
    this.socket.emit('interact', JSON.stringify({ nonce: this.nonce.value + 1 } as UserInteraction));
  }
}

export const enrichedSocket = signal<EnrichedSocket>(new EnrichedSocket(BACKEND_URL, id.peek()));