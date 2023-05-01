import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const handleOnConnect = (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>): void => {
  socket.emit('map_init', {
    mapHeight: 1,
    mapWidth: 5,
    data: [[0,1,2,3,4]]
  });
};