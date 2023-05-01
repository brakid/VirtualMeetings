from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
from flask_httpauth import HTTPBasicAuth
import numpy as np
import json

app = Flask(__name__)
socketio = SocketIO(app)

auth = HTTPBasicAuth()

MAP = np.zeros((5, 5))

@auth.verify_password
def verify_password(username, password):
    return (username == 'hagen') and (password == 'samplepass')

@socketio.on('user_update')
def user_update(message):
    motion = message['data']

    emit('map_init', {'data': message['data']})

@socketio.on('connect')
@auth.login_required
def connect():
    sid = request.sid
    print('Client connected ' + sid)
    emit('map_init', {'data': MAP.tolist(), 'mapWidth': 5, 'mapHeight': 5}, to=sid)

@socketio.on('disconnect')
def disconnect():
    sid = request.sid
    print('Client disconnected ' + sid)

@app.route('/')
@auth.login_required
def index():
   return render_template('index.html')


if __name__ == '__main__':
    socketio.run(app)