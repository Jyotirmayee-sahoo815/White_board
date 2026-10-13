const { isValidRoomId, normalizeRoomId } = require("./roomId");

const MAX_USERNAME = 20;
const MAX_POINTS_PER_EVENT = 80;
const MAX_STROKE_POINTS = 2500;
const MAX_STROKES = 4000;
const USER_COLORS = [
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#f43f5e",
  "#22c55e",
];

function sanitizeUsername(raw) {
  if (typeof raw !== "string") return null;
  const username = raw.replace(/\s+/g, " ").trim();
  if (username.length < 1 || username.length > MAX_USERNAME) return null;
  if (!/^[\p{L}\p{N}\s.\-']+$/u.test(username)) return null;
  return username;
}

function isValidUserId(userId) {
  return typeof userId === "string" && userId.length >= 8 && userId.length <= 64;
}

function isValidColor(color) {
  return typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color);
}

function isValidTool(tool) {
  return tool === "pen" || tool === "eraser";
}

function isValidLineWidth(width) {
  return typeof width === "number" && Number.isFinite(width) && width >= 1 && width <= 48;
}

function sanitizePoint(point) {
  if (!point || typeof point !== "object") return null;
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < -100 || y < -100 || x > 4000 || y > 4000) return null;
  return { x, y };
}

function sanitizePoints(points) {
  if (!Array.isArray(points) || points.length === 0) return [];
  if (points.length > MAX_POINTS_PER_EVENT) return null;
  const clean = [];
  for (const p of points) {
    const next = sanitizePoint(p);
    if (!next) return null;
    clean.push(next);
  }
  return clean;
}

function sanitizeStroke(stroke) {
  if (!stroke || typeof stroke !== "object") return null;
  if (typeof stroke.id !== "string" || stroke.id.length < 4 || stroke.id.length > 64) return null;
  if (!isValidUserId(stroke.userId)) return null;
  if (!isValidTool(stroke.tool)) return null;
  if (!isValidColor(stroke.color)) return null;
  if (!isValidLineWidth(stroke.lineWidth)) return null;
  if (!Array.isArray(stroke.points) || stroke.points.length > MAX_STROKE_POINTS) return null;

  const points = [];
  for (const p of stroke.points) {
    const next = sanitizePoint(p);
    if (!next) return null;
    points.push(next);
  }

  return {
    id: stroke.id,
    userId: stroke.userId,
    tool: stroke.tool,
    color: stroke.color,
    lineWidth: stroke.lineWidth,
    points,
  };
}

function colorForUser(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return USER_COLORS[hash % USER_COLORS.length];
}

function rateLimiter(maxPerSecond) {
  const hits = new Map();

  return function allow(key) {
    const now = Date.now();
    const bucket = hits.get(key) || [];
    const recent = bucket.filter((t) => now - t < 1000);
    if (recent.length >= maxPerSecond) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}

module.exports = {
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
  isValidRoomId,
  normalizeRoomId,
};
