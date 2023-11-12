import eventlet
import socketio
import json
import numpy as np

sio = socketio.Server()
app = socketio.WSGIApp(sio, static_files={
    '/': {'content_type': 'text/html', 'filename': 'index.html'}
})

MAP = np.zeros((5, 5))
USERS = {}

def find_position() -> (int, int):
    global MAP, USERS
    found = False
    while not found:
        x, y = np.random.randint(0, MAP.shape, 2)
        x, y = int(x), int(y)
        for user_position in USERS.values():
            if user_position == (x, y):
                continue
        break
    return x, y

def encode_positions(users: dict) -> list:
    return [ { 'user_id': user_id, 'position': { 'x': position[0], 'y': position[1] } } for user_id, position in users.items() ]

@sio.event
def connect(sid, env):
    print('connect ', sid, env)
    position = find_position()
    USERS[sid] = position
    print(USERS)
    sio.emit('initiate', { 'user_id': sid })
    sio.emit('new_joiner', encode_positions(USERS))

@sio.event
def message(sid, event, data):
    print('message ', sid, event, data)
    sio.emit('acknowledged', True, room=sid)

@sio.event
def disconnect(sid):
    del USERS[sid]
    print('disconnect ', sid)

if __name__ == '__main__':
    eventlet.wsgi.server(eventlet.listen(('', 5000)), app)