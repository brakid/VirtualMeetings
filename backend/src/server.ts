import { Server } from 'socket.io';
import { Handler, MAP } from './handler';
import { createServer } from 'http';
import * as path from 'path';
import express, { Express, Request, Response } from 'express';
import { basicAuthHandler } from './authorization';
import { LoginData, USER_JOIN_EVENT, USER_LEAVE_EVENT, USER_UPDATE_EVENT } from './types';

const app: Express = express();

app.use(basicAuthHandler);
app.use(express.static(path.join(__dirname, '/../static')));
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
io.engine.use(basicAuthHandler);

const handler = new Handler(io, MAP);
app.get('/', (req: Request, res: Response) => {
  res.sendFile('index.html');
});

io.on('connect', socket => {
  console.log(`Connected: ${socket.id}`);

  socket.on(USER_JOIN_EVENT, (data) => {
    console.log(`User ${socket.id} with data ${JSON.stringify(data)} wants to join`);
    handler.handleOnJoin(socket, data as LoginData);
  });
  socket.on(USER_LEAVE_EVENT, () => {
    console.log(`User ${socket.id} disconnects`);
    handler.handleOnLeave(socket);
  });
  socket.on(USER_UPDATE_EVENT, (data) => {
    console.log(`User ${socket.id} sent an update`);
    handler.handleUpdate(socket, data);
  });
});

server.listen(8080, () => {
  console.log('⚡️[server]: Server is running at http://localhost:8080');
});