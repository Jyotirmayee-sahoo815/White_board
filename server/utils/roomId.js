const crypto = require("crypto");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomId(length = 6) {
  const bytes = crypto.randomBytes(length);
  let id = "";
  for (let i = 0; i < length; i += 1) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}

function isValidRoomId(roomId) {
  return typeof roomId === "string" && /^[A-HJ-NP-Z2-9]{6}$/.test(roomId.trim().toUpperCase());
}

function normalizeRoomId(roomId) {
  return String(roomId || "")
    .trim()
    .toUpperCase();
}

module.exports = { generateRoomId, isValidRoomId, normalizeRoomId };
