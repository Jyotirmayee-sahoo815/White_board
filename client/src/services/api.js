import { SERVER_URL } from "./socket";

async function request(path, options = {}) {
  const res = await fetch(`${SERVER_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export function createRoomApi() {
  return request("/api/rooms", { method: "POST" });
}

export function getRoomApi(roomId) {
  return request(`/api/rooms/${encodeURIComponent(roomId)}`);
}

export function healthApi() {
  return request("/api/health");
}
