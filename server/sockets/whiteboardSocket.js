const Room = require("../models/Room");
const { isDbConnected } = require("../config/db");
const { generateRoomId, isValidRoomId, normalizeRoomId } = require("../utils/roomId");
const { rememberRoom, roomWasCreated } = require("../utils/roomStore");
const {
  MAX_STROKES,
  MAX_STROKE_POINTS,
  sanitizeUsername,
  isValidUserId,
  isValidColor,
  isValidTool,
  isValidLineWidth,
  sanitizePoints,
  sanitizeStroke,
  colorForUser,
  rateLimiter,
} = require("../utils/validatePayload");

/**
 * Socket.IO events
 *
 * Client -> Server
 *  room:create   Create a room and join it. Ack: { roomId, user, users, strokes }
 *  room:join     Join an existing room. Ack: { roomId, user, users, strokes } | { error }
 *  room:leave    Leave the current room
 *  draw:start    Begin a stroke { strokeId, tool, color, lineWidth, point }
 *  draw:move     Append points { strokeId, points }
 *  draw:end      Finish a stroke { strokeId }
 *  cursor:move   Broadcast pointer { x, y } in logical board coords
 *  board:clear   Clear all strokes for everyone
 *  board:undo    Remove a stroke by id (owner only)
 *  board:redo    Re-apply a previously undone stroke
 *
 * Server -> Client
 *  user:joined   A user entered the room
 *  user:left     A user left the room
 *  users:list    Full online user list
 *  draw:start    Remote stroke started
 *  draw:move     Remote stroke points
 *  draw:end      Remote stroke finished
 *  cursor:move   Remote cursor { userId, username, color, x, y }
 *  cursor:leave  Hide a remote cursor
 *  board:clear   Board was cleared
 *  board:state   Full stroke list (join / reconnect)
 *  board:undo    Stroke removed
 *  board:redo    Stroke restored
 *  room:error    Friendly error { message }
 */

const rooms = new Map();
const allowCursor = rateLimiter(25);
const allowDrawMove = rateLimiter(40);

function getOrCreateMemoryRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      roomId,
      users: new Map(),
      strokes: [],
      activeStrokes: new Map(),
      saveTimer: null,
      dirty: false,
    });
  }
  return rooms.get(roomId);
}

async function loadRoom(roomId) {
  const memory = getOrCreateMemoryRoom(roomId);
  if (memory.loaded) return memory;

  if (isDbConnected()) {
    try {
      const doc = await Room.findOne({ roomId });
      if (doc) {
        memory.strokes = Array.isArray(doc.strokes) ? doc.strokes.map((s) => s.toObject?.() || s) : [];
      } else {
        await Room.create({ roomId, strokes: [] });
      }
    } catch (err) {
      console.error("[room] failed to load", roomId, err.message);
    }
  }

  memory.loaded = true;
  return memory;
}

function scheduleSave(room) {
  room.dirty = true;
  if (room.saveTimer) return;
  room.saveTimer = setTimeout(() => {
    room.saveTimer = null;
    persistRoom(room);
  }, 1500);
}

async function persistRoom(room) {
  if (!room.dirty) return;
  if (!isDbConnected()) return;
  room.dirty = false;
  try {
    await Room.findOneAndUpdate(
      { roomId: room.roomId },
      { strokes: room.strokes, lastActivity: new Date() },
      { upsert: true }
    );
  } catch (err) {
    room.dirty = true;
    console.error("[db] persist failed", room.roomId, err.message);
  }
}

function publicUsers(room) {
  return [...room.users.values()].map((u) => ({
    id: u.userId,
    socketId: u.socketId,
    username: u.username,
    color: u.color,
  }));
}

function findStroke(room, strokeId) {
  return room.strokes.find((s) => s.id === strokeId);
}

function attachWhiteboardSocket(io) {
  io.on("connection", (socket) => {
    socket.data.roomId = null;
    socket.data.userId = null;

    socket.on("room:create", async (payload, ack) => {
      const respond = typeof ack === "function" ? ack : () => {};
      const username = sanitizeUsername(payload?.username);
      const userId = payload?.userId;

      if (!username) {
        respond({ error: "Enter a valid username (1–20 characters)." });
        return;
      }
      if (!isValidUserId(userId)) {
        respond({ error: "Invalid user session. Refresh and try again." });
        return;
      }

      let roomId = generateRoomId();
      if (isDbConnected()) {
        for (let i = 0; i < 6; i += 1) {
          const exists = await Room.exists({ roomId });
          if (!exists) break;
          roomId = generateRoomId();
        }
      }

      await joinSocketToRoom(io, socket, { roomId, username, userId, create: true }, respond);
    });

    socket.on("room:join", async (payload, ack) => {
      const respond = typeof ack === "function" ? ack : () => {};
      const roomId = normalizeRoomId(payload?.roomId);
      const username = sanitizeUsername(payload?.username);
      const userId = payload?.userId;

      if (!isValidRoomId(roomId)) {
        respond({ error: "That room ID is not valid." });
        return;
      }
      if (!username) {
        respond({ error: "Enter a valid username (1–20 characters)." });
        return;
      }
      if (!isValidUserId(userId)) {
        respond({ error: "Invalid user session. Refresh and try again." });
        return;
      }

      const existsInDb = isDbConnected() ? await Room.exists({ roomId }) : false;
      const memory = rooms.get(roomId);
      if (!existsInDb && !memory && !roomWasCreated(roomId)) {
        respond({ error: "Room not found. Check the ID or create a new room." });
        return;
      }

      await joinSocketToRoom(io, socket, { roomId, username, userId, create: false }, respond);
    });

    socket.on("room:leave", () => {
      leaveRoom(io, socket);
    });

    socket.on("draw:start", (payload) => {
      const room = currentRoom(socket);
      if (!room) return;
      const userId = socket.data.userId;
      const strokeId = payload?.strokeId;
      const tool = payload?.tool;
      const color = payload?.color;
      const lineWidth = Number(payload?.lineWidth);
      const point = payload?.point ? { x: payload.point.x, y: payload.point.y } : payload?.points?.[0];
      const points = sanitizePoints(point ? [point] : payload?.points);

      if (typeof strokeId !== "string" || strokeId.length > 64) return;
      if (!isValidTool(tool) || !isValidColor(color) || !isValidLineWidth(lineWidth)) return;
      if (!points || points.length === 0) return;
      if (room.strokes.length >= MAX_STROKES) return;

      const stroke = {
        id: strokeId,
        userId,
        tool,
        color,
        lineWidth,
        points: [...points],
      };
      room.activeStrokes.set(strokeId, stroke);
      socket.to(room.roomId).emit("draw:start", {
        roomId: room.roomId,
        userId,
        type: "draw",
        strokeId,
        points,
        color,
        lineWidth,
        tool,
      });
    });

    socket.on("draw:move", (payload) => {
      if (!allowDrawMove(socket.id)) return;
      const room = currentRoom(socket);
      if (!room) return;
      const strokeId = payload?.strokeId;
      const extra = sanitizePoints(payload?.points);
      if (!strokeId || !extra) return;

      const stroke = room.activeStrokes.get(strokeId);
      if (!stroke || stroke.userId !== socket.data.userId) return;
      if (stroke.points.length + extra.length > MAX_STROKE_POINTS) return;

      stroke.points.push(...extra);
      socket.to(room.roomId).emit("draw:move", {
        roomId: room.roomId,
        userId: socket.data.userId,
        type: "draw",
        strokeId,
        points: extra,
        color: stroke.color,
        lineWidth: stroke.lineWidth,
        tool: stroke.tool,
      });
    });

    socket.on("draw:end", (payload) => {
      const room = currentRoom(socket);
      if (!room) return;
      const strokeId = payload?.strokeId;
      const stroke = room.activeStrokes.get(strokeId);
      if (!stroke || stroke.userId !== socket.data.userId) return;

      room.activeStrokes.delete(strokeId);
      if (stroke.points.length > 0 && room.strokes.length < MAX_STROKES) {
        room.strokes.push(stroke);
        scheduleSave(room);
      }
      socket.to(room.roomId).emit("draw:end", {
        roomId: room.roomId,
        userId: socket.data.userId,
        strokeId,
      });
    });

    socket.on("cursor:move", (payload) => {
      if (!allowCursor(socket.id)) return;
      const room = currentRoom(socket);
      if (!room) return;
      const x = Number(payload?.x);
      const y = Number(payload?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const user = room.users.get(socket.id);
      if (!user) return;
      socket.to(room.roomId).emit("cursor:move", {
        userId: user.userId,
        username: user.username,
        color: user.color,
        x,
        y,
      });
    });

    socket.on("board:clear", () => {
      const room = currentRoom(socket);
      if (!room) return;
      room.strokes = [];
      room.activeStrokes.clear();
      scheduleSave(room);
      io.to(room.roomId).emit("board:clear", { userId: socket.data.userId });
    });

    socket.on("board:undo", (payload) => {
      const room = currentRoom(socket);
      if (!room) return;
      const strokeId = payload?.strokeId;
      const index = room.strokes.findIndex((s) => s.id === strokeId && s.userId === socket.data.userId);
      if (index === -1) return;
      const [removed] = room.strokes.splice(index, 1);
      scheduleSave(room);
      io.to(room.roomId).emit("board:undo", { strokeId: removed.id, userId: socket.data.userId });
    });

    socket.on("board:redo", (payload) => {
      const room = currentRoom(socket);
      if (!room) return;
      const stroke = sanitizeStroke(payload?.stroke);
      if (!stroke) return;
      if (stroke.userId !== socket.data.userId) return;
      if (findStroke(room, stroke.id)) return;
      if (room.strokes.length >= MAX_STROKES) return;
      room.strokes.push(stroke);
      scheduleSave(room);
      io.to(room.roomId).emit("board:redo", { stroke });
    });

    socket.on("disconnect", () => {
      leaveRoom(io, socket);
    });
  });
}

function currentRoom(socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return null;
  return rooms.get(roomId) || null;
}

async function joinSocketToRoom(io, socket, { roomId, username, userId, create }, respond) {
  if (socket.data.roomId) {
    leaveRoom(io, socket);
  }

  rememberRoom(roomId);
  const room = await loadRoom(roomId);
  const user = {
    socketId: socket.id,
    userId,
    username,
    color: colorForUser(userId),
  };

  socket.join(roomId);
  socket.data.roomId = roomId;
  socket.data.userId = userId;
  room.users.set(socket.id, user);

  socket.to(roomId).emit("user:joined", {
    user: { id: user.userId, username: user.username, color: user.color },
    users: publicUsers(room),
  });
  io.to(roomId).emit("users:list", { users: publicUsers(room) });
  socket.emit("board:state", { strokes: room.strokes });

  respond({
    roomId,
    created: Boolean(create),
    user: { id: user.userId, username: user.username, color: user.color },
    users: publicUsers(room),
    strokes: room.strokes,
  });
}

function leaveRoom(io, socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;
  const room = rooms.get(roomId);
  socket.leave(roomId);
  socket.data.roomId = null;

  if (!room) return;
  const user = room.users.get(socket.id);
  room.users.delete(socket.id);

  if (user) {
    socket.to(roomId).emit("user:left", {
      userId: user.userId,
      username: user.username,
      users: publicUsers(room),
    });
    socket.to(roomId).emit("cursor:leave", { userId: user.userId });
    io.to(roomId).emit("users:list", { users: publicUsers(room) });
  }

  if (room.users.size === 0) {
    persistRoom(room);
    if (room.saveTimer) {
      clearTimeout(room.saveTimer);
      room.saveTimer = null;
    }
    // Keep persisted rooms in MongoDB so a refresh can restore drawings.
    // Drop in-memory state after a short delay if nobody rejoins.
    setTimeout(() => {
      const current = rooms.get(roomId);
      if (current && current.users.size === 0) {
        rooms.delete(roomId);
      }
    }, 30_000);
  }
}

module.exports = { attachWhiteboardSocket };
