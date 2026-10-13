export const BOARD_WIDTH = 1920;
export const BOARD_HEIGHT = 1080;

export const USER_ID_KEY = "scribbleboard_userId";
export const USERNAME_KEY = "scribbleboard_username";

export function getUserId() {
  let id = sessionStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export function makeStrokeId() {
  return crypto.randomUUID();
}

export function normalizeRoomId(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

export function isValidRoomId(value) {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(normalizeRoomId(value));
}

export function sanitizeUsername(value) {
  const username = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (username.length < 1 || username.length > 20) return null;
  if (!/^[\p{L}\p{N}\s.\-']+$/u.test(username)) return null;
  return username;
}

export function throttle(fn, wait) {
  let last = 0;
  let timer = null;
  let latestArgs = null;

  return function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    latestArgs = args;
    if (remaining <= 0) {
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn.apply(this, latestArgs);
      }, remaining);
    }
  };
}

export function clientToBoard(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const source = event.touches?.[0] || event.changedTouches?.[0] || event;
  const x = ((source.clientX - rect.left) / rect.width) * BOARD_WIDTH;
  const y = ((source.clientY - rect.top) / rect.height) * BOARD_HEIGHT;
  return { x, y };
}
