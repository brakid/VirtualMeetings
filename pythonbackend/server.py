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

def find_position():
    global MAP, USERS
    found = False
    while not found:
        x, y = np.random.randint(0, MAP.shape, len(MAP.shape))
        for user_position in USERS.values():
            if user_position == (x, y):
                continue
        break
    return int(x), int(y)

@sio.event
def connect(sid, environ):
    print('connect ', sid)
    position = find_position()
    USERS[sid] = position
    res = { 'position': { 'x': position[0], 'y': position[1] } }
    sio.emit('initiate', { 'user_id': sid, 'position': { 'x': position[0], 'y': position[1] } })

@sio.event
def message(sid, data):
    print('message ', sid, data)
    sio.emit('acknowledged', True, room=sid)

@sio.event
def disconnect(sid):
    del USERS[sid]
    print('disconnect ', sid)

if __name__ == '__main__':
    eventlet.wsgi.server(eventlet.listen(('', 5000)), app)