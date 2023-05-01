API is protected bz HTTP Authentication
https://stackoverflow.com/questions/28118695/socket-io-with-basic-authentication-on-node

https://github.com/miguelgrinberg/python-socketio/blob/main/examples/server/aiohttp/app.html

On connect:
1. server checks client id, and if allowed adds into the the *lobby room*, sends **map_init** to share the current state of the map
2. clients can send updates for movement and actions via **client_update**
3. update events are brodcasted in the channel of the repective room

* each room has it's own channel
