import eventlet
import socketio
import json
import numpy as np
from enum import StrEnum, auto

sio = socketio.Server()
app = socketio.WSGIApp(sio, static_files={
    '/': {'content_type': 'text/html', 'filename': 'index.html'}
})

MAP = np.zeros((1, 1)).astype(np.int8)
USERS = {}
MAX_ATTEMPTS = 5

class Direction(StrEnum):
    UP = auto()
    DOWN = auto()
    LEFT = auto()
    RIGHT = auto()

def find_position() -> (int, int):
    global MAP, USERS, MAX_ATTEMPTS
    attempt = MAX_ATTEMPTS
    x, y = None, None
    found = False
    while attempt > 0:
        attempt -= 1
        x, y = np.random.randint(0, MAP.shape, 2)
        x, y = int(x), int(y)
        if MAP[x, y] != 0:
            continue
        for user_position in USERS.values():
            if user_position == (x, y):
                continue
        found = True
        break
    if found:
        return x, y
    else:
        return None

def encode_positions(users: dict) -> list:
    return [ { 'user_id': user_id, 'position': { 'x': position[0], 'y': position[1] } } for user_id, position in users.items() ]

def move(user_id: str, direction: Direction) -> bool:
    global MAP, USERS
    current_x, current_y = USERS[user_id]
    new_x, new_y = current_x, current_y
    if direction == Direction.UP:
        new_y = current_y - 1
    elif direction == Direction.DOWN:
        new_y = current_y + 1
    elif direction == Direction.LEFT:
        new_x = current_x - 1
    elif direction == Direction.RIGHT:
        new_x = current_x + 1

    if (new_x < 0) or (new_y < 0) or (new_x >= MAP.shape[0]) or (new_y >= MAP.shape[1]):
        return False
    if MAP[new_x, new_y] != 0:
        return False
    user_positions = set(USERS.values())
    if (new_x, new_y) in user_positions:
        return False
    
    USERS[user_id] = (new_x, new_y)
    return True

@sio.event
def connect(sid, env):
    print('connect', sid)
    position = find_position()
    if position:
        USERS[sid] = position
        print(USERS)
        sio.emit('initiate', { 'user_id': sid, 'map': MAP.tolist() })
        sio.emit('update', encode_positions(USERS))
    else:
        sio.emit('rejected', False, room=sid)

@sio.event
def message(sid, event, data):
    print('message ', sid, event, data)
    if event == 'move':
        direction = Direction(data.get('direction').lower())
        print(direction)
        if move(sid, direction):
            sio.emit('acknowledged', True, room=sid)
            sio.emit('update', encode_positions(USERS))
        else:
            sio.emit('rejected', False, room=sid)
            sio.emit('update', encode_positions(USERS))

@sio.event
def disconnect(sid):
    print('disconnect ', sid)
    if sid in USERS:
        del USERS[sid]
        sio.emit('update', encode_positions(USERS))

if __name__ == '__main__':
    eventlet.wsgi.server(eventlet.listen(('', 5000)), app)