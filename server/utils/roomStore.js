const createdRooms = new Set();

function rememberRoom(roomId) {
  createdRooms.add(roomId);
}

function roomWasCreated(roomId) {
  return createdRooms.has(roomId);
}

module.exports = { rememberRoom, roomWasCreated };
