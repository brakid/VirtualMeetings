import { UNAUTHORIZED, extractUsername } from './authorization';

const users: Map<string, boolean> = new Map();
const allUsersTopic = 'allUsers';

const server = Bun.serve<{ username: string }>({
  fetch(req, server) {
    try {
      const username = extractUsername(req);

      const url = new URL(req.url);
      if (url.pathname === '/chat') {
        console.log('WebSocket connection upgrade');
        const success = server.upgrade(req, { data: { username } });
        return success ? undefined : new Response('WebSocket upgrade error', { status: 400 });
      }

      return new Response(Bun.file('./index.html'));
    } catch (error) {
      return UNAUTHORIZED;
    }
  },
  websocket: {
    open(ws) {
      users.set(ws.data.username, true);

      ws.subscribe(allUsersTopic);
      ws.publish(allUsersTopic, JSON.stringify([ ...users.keys() ]));
      ws.send(JSON.stringify([ ...users.keys() ]));
    },
    message(ws, message) {
      console.log(message);
      const data = JSON.parse(message.toString());
      console.log(data);
      // the server re-broadcasts incoming messages to everyone
      ws.publish("the-group-chat", `${ws.data.username}: ${message}`);
    },
    close(ws) {
      users.delete(ws.data.username);

      ws.publish(allUsersTopic, JSON.stringify([ ...users.keys() ]));
      ws.unsubscribe(allUsersTopic);
    },
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);