import { Server } from 'socket.io';
import { handleOnConnect } from './handler';
import { createServer } from 'http';
import * as path from 'path';
import express, { Express, Request, Response } from 'express';
import { basicAuthHandler } from './authorization';

const app: Express = express();

app.use(basicAuthHandler);
app.use(express.static(path.join(__dirname, '/../static')));
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
io.engine.use(basicAuthHandler);

app.get('/', (req: Request, res: Response) => {
  res.sendFile('index.html');
});

io.on('connect', socket => {
  handleOnConnect(socket);
  console.log('Connected: ' + socket.id);
});

server.listen(8080, () => {
  console.log('⚡️[server]: Server is running at http://localhost:8080');
});