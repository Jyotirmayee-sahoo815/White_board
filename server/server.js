require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const { connectDB, isDbConnected } = require("./config/db");
const roomRoutes = require("./routes/roomRoutes");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { attachWhiteboardSocket } = require("./sockets/whiteboardSocket");

const PORT = Number(process.env.PORT) || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const app = express();
const allowedOrigins = CLIENT_URL.split(",").map((s) => s.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    db: isDbConnected() ? "connected" : "in-memory",
  });
});

app.use("/api/rooms", roomRoutes);
app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 25000,
});

attachWhiteboardSocket(io);

async function start() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`[server] ScribbleBoard listening on http://localhost:${PORT}`);
    console.log(`[server] CORS origin: ${allowedOrigins.join(", ")}`);
  });
}

start().catch((err) => {
  console.error("[server] failed to start", err);
  process.exit(1);
});
