# ScribbleBoard

Repository: [https://github.com/Jyotirmayee-sahoo815/White_board](https://github.com/Jyotirmayee-sahoo815/White_board)

Real-time collaborative whiteboard. Multiple people join the same room, draw on a shared canvas, and see strokes, cursors, and presence update instantly — without refreshing.

> Draw. Collaborate. Create — together in real time.

## Features

- Create or join rooms with a short shareable room ID
- HTML5 canvas drawing: pen, eraser, color, brush size
- Real-time stroke sync with Socket.IO (points, not images)
- Live cursors with usernames
- Online users panel
- Undo / redo (synced for your strokes)
- Clear board for everyone
- Download the board as PNG
- Copy room link (`/room/ABC123`)
- Light / dark theme
- MongoDB persistence of board strokes (debounced)
- Reconnect and restore board state on refresh
- Friendly errors for invalid rooms, missing names, and a downed server

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 18, Vite, JavaScript, Tailwind CSS, Canvas API, Socket.IO Client, React Router |
| Backend | Node.js, Express, Socket.IO |
| Database | MongoDB + Mongoose |

## Architecture

```
Browser A ──┐
            ├── HTTP (create/check rooms) ──► Express
Browser B ──┤
            └── Socket.IO (strokes, cursors, presence) ──► room namespace
                                                              │
                                                              └── MongoDB (debounced stroke list)
```

The canvas uses a fixed logical size (`1920×1080`). Pointer events are converted into that coordinate space so drawings stay aligned after resize and across different screens.

Strokes are stored as `{ id, userId, tool, color, lineWidth, points[] }`. Remote clients replay those points instead of receiving PNG snapshots.

Board writes to MongoDB are **debounced (~1.5s)** after `draw:end`, undo, redo, and clear — not on every mouse move.

## Folder structure

```
├── client/                 React + Vite app
│   └── src/
│       ├── components/     Whiteboard, Canvas, Toolbar, UsersPanel, Cursor, Toast
│       ├── pages/          Home, Room
│       ├── hooks/          Theme + toast providers
│       ├── services/       Socket.IO client + REST helpers
│       └── utils/
├── server/
│   ├── config/             MongoDB connection
│   ├── controllers/        Room HTTP API
│   ├── models/             Room + stroke schema
│   ├── routes/
│   ├── sockets/            whiteboardSocket.js
│   ├── middleware/
│   ├── utils/
│   └── server.js
└── README.md
```

## Socket.IO events

### Client → server

| Event | Purpose |
| --- | --- |
| `room:create` | Create a room and join it |
| `room:join` | Join an existing room; ack returns users + strokes |
| `room:leave` | Leave the current room |
| `draw:start` | Begin a stroke (id, tool, color, width, first point) |
| `draw:move` | Append a small batch of points (throttled) |
| `draw:end` | Commit the stroke to room state |
| `cursor:move` | Pointer position in board coordinates (throttled) |
| `board:clear` | Wipe all strokes |
| `board:undo` | Remove a stroke you own |
| `board:redo` | Restore an undone stroke |

### Server → client

| Event | Purpose |
| --- | --- |
| `user:joined` / `user:left` | Presence |
| `users:list` | Full online list |
| `draw:start` / `draw:move` / `draw:end` | Remote drawing |
| `cursor:move` / `cursor:leave` | Remote cursors |
| `board:clear` / `board:undo` / `board:redo` | Shared history |
| `board:state` | Full stroke list on join / reconnect |

## Installation

Prerequisites: **Node.js 18+**, and optionally **MongoDB** (the API still runs in memory if MongoDB is unavailable).

```bash
cd "white board"
npm install
npm run install:all
```

## Environment variables

### Frontend (`client/.env`)

```
VITE_SERVER_URL=http://localhost:5000
```

### Backend (`server/.env`)

```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/scribbleboard
CLIENT_URL=http://localhost:5173
```

Copy from `client/.env.example` and `server/.env.example` if needed.

## MongoDB setup

1. Install [MongoDB Community](https://www.mongodb.com/try/download/community) or use MongoDB Atlas.
2. Start a local daemon (`mongod`) or put your Atlas URI in `MONGODB_URI`.
3. The server logs `[db] MongoDB connected` on success.
4. If MongoDB is down, the server logs a warning and keeps rooms in memory until restart.

## How to run

From the project root:

```bash
npm run dev
```

Or in two terminals:

```bash
npm run dev:server
npm run dev:client
```

- Frontend: http://localhost:5173  
- Backend health: http://localhost:5000/api/health  

## How to test multiple users locally

1. Start both apps with `npm run dev`.
2. Open http://localhost:5173 in **two browser tabs** (or a window + incognito).
3. Tab 1: enter a name → **Create Room**.
4. Copy the room ID (header) or click **Share**.
5. Tab 2: enter a different name → paste the room ID → **Join Room** (or open the shared `/room/XXXXXX` link).
6. Draw in Tab 1 — the stroke should appear in Tab 2 immediately.
7. Move the mouse over the board — the other tab shows a labeled cursor.
8. Both names should appear under **Online**.
9. Refresh Tab 2 — existing strokes should reload from server / MongoDB.

## Deployment

1. Deploy the Express server (Render, Railway, Fly.io, a VPS). Set `PORT`, `MONGODB_URI`, and `CLIENT_URL` to your frontend origin.
2. Deploy the Vite app (Netlify, Vercel, Cloudflare Pages). Build with `npm run build` in `client/` and set `VITE_SERVER_URL` to the public API URL (including protocol).
3. Allow the frontend origin in Socket.IO CORS (`CLIENT_URL`). You can pass multiple origins as a comma-separated list.
4. Use a MongoDB Atlas cluster for persistence.
5. If the frontend and API are on different hosts, do **not** rely on the Vite proxy — `VITE_SERVER_URL` must point at the live API.

## License

MIT
