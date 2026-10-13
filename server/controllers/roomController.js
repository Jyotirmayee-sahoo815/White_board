const Room = require("../models/Room");
const { generateRoomId, isValidRoomId, normalizeRoomId } = require("../utils/roomId");
const { isDbConnected } = require("../config/db");
const { rememberRoom, roomWasCreated } = require("../utils/roomStore");

async function createRoom(_req, res, next) {
  try {
    let roomId = generateRoomId();
    if (isDbConnected()) {
      for (let i = 0; i < 5; i += 1) {
        const exists = await Room.exists({ roomId });
        if (!exists) break;
        roomId = generateRoomId();
      }
      await Room.create({ roomId, strokes: [] });
    }
    rememberRoom(roomId);
    res.status(201).json({ roomId });
  } catch (err) {
    next(err);
  }
}

async function getRoom(req, res, next) {
  try {
    const roomId = normalizeRoomId(req.params.roomId);
    if (!isValidRoomId(roomId)) {
      return res.status(400).json({ error: "Invalid room ID.", exists: false });
    }

    if (!isDbConnected()) {
      const exists = roomWasCreated(roomId);
      if (!exists) {
        return res.status(404).json({ error: "Room not found.", exists: false });
      }
      return res.json({
        roomId,
        exists: true,
        persisted: false,
      });
    }

    const room = await Room.findOne({ roomId }).lean();
    if (!room) {
      return res.status(404).json({ error: "Room not found.", exists: false });
    }

    return res.json({
      roomId: room.roomId,
      exists: true,
      persisted: true,
      strokeCount: room.strokes?.length || 0,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createRoom, getRoom };
