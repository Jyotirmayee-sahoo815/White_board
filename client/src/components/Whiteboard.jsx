import { useEffect, useMemo, useRef, useState } from "react";
import Canvas from "./Canvas.jsx";
import Toolbar from "./Toolbar.jsx";
import UsersPanel from "./UsersPanel.jsx";
import CursorOverlay from "./Cursor.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { connectSocket } from "../services/socket.js";
import { getUserId, makeStrokeId, throttle } from "../utils/helpers.js";
import { useToast } from "../hooks/useToast.jsx";

export default function Whiteboard({ roomId, username, onLeave }) {
  const { push } = useToast();
  const canvasRef = useRef(null);
  const undoRef = useRef([]);
  const redoRef = useRef([]);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#4f46e5");
  const [lineWidth, setLineWidth] = useState(4);
  const [users, setUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const [status, setStatus] = useState("connecting");
  const [historyTick, setHistoryTick] = useState(0);
  const userId = useMemo(() => getUserId(), []);
  const currentStrokeId = useRef(null);
  const moveBuffer = useRef([]);

  const bumpHistory = () => setHistoryTick((n) => n + 1);

  const emitBufferedMoves = useMemo(
    () =>
      throttle(() => {
        if (!currentStrokeId.current || moveBuffer.current.length === 0) return;
        connectSocket().emit("draw:move", {
          strokeId: currentStrokeId.current,
          points: moveBuffer.current.splice(0, moveBuffer.current.length),
        });
      }, 32),
    []
  );

  const sendCursor = useMemo(
    () =>
      throttle((point) => {
        connectSocket().emit("cursor:move", point);
      }, 40),
    []
  );

  function flushMovesNow() {
    if (!currentStrokeId.current || moveBuffer.current.length === 0) return;
    connectSocket().emit("draw:move", {
      strokeId: currentStrokeId.current,
      points: moveBuffer.current.splice(0, moveBuffer.current.length),
    });
  }

  useEffect(() => {
    const socket = connectSocket();
    let cancelled = false;

    const join = () => {
      socket.emit("room:join", { roomId, username, userId }, (res) => {
        if (cancelled) return;
        if (res?.error) {
          setStatus("error");
          push(res.error, "error");
          onLeave?.(res.error);
          return;
        }
        setStatus("connected");
        setUsers(res.users || []);
        canvasRef.current?.setStrokes(res.strokes || []);
        undoRef.current = [];
        redoRef.current = [];
        bumpHistory();
      });
    };

    const onConnect = () => {
      setStatus("connected");
      join();
    };
    const onDisconnect = () => setStatus("disconnected");
    const onUsers = ({ users: next }) => setUsers(next || []);
    const onJoined = ({ user, users: next }) => {
      setUsers(next || []);
      if (user?.id && user.id !== userId) push(`${user.username} joined`, "info");
    };
    const onLeft = ({ userId: leftId, username: leftName, users: next }) => {
      setUsers(next || []);
      setCursors((map) => {
        const copy = { ...map };
        delete copy[leftId];
        return copy;
      });
      if (leftName) push(`${leftName} left`, "info");
    };
    const onDrawStart = (payload) => {
      if (payload.userId === userId) return;
      canvasRef.current?.startRemoteStroke({
        id: payload.strokeId,
        userId: payload.userId,
        tool: payload.tool,
        color: payload.color,
        lineWidth: payload.lineWidth,
        points: payload.points || [],
      });
    };
    const onDrawMove = (payload) => {
      if (payload.userId === userId) return;
      canvasRef.current?.appendRemotePoints(payload.strokeId, payload.points || [], {
        userId: payload.userId,
        tool: payload.tool,
        color: payload.color,
        lineWidth: payload.lineWidth,
      });
    };
    const onDrawEnd = (payload) => {
      if (payload.userId === userId) return;
      canvasRef.current?.endRemoteStroke(payload.strokeId);
    };
    const onCursor = (payload) => {
      if (payload.userId === userId) return;
      setCursors((map) => ({ ...map, [payload.userId]: payload }));
    };
    const onCursorLeave = ({ userId: leftId }) => {
      setCursors((map) => {
        const copy = { ...map };
        delete copy[leftId];
        return copy;
      });
    };
    const onClear = () => {
      canvasRef.current?.clear();
      undoRef.current = [];
      redoRef.current = [];
      bumpHistory();
    };
    const onState = ({ strokes }) => {
      canvasRef.current?.setStrokes(strokes || []);
    };
    const onUndo = ({ strokeId, userId: from }) => {
      canvasRef.current?.removeStroke(strokeId);
      if (from === userId) {
        // already handled locally
      }
    };
    const onRedo = ({ stroke }) => {
      canvasRef.current?.addStroke(stroke);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("users:list", onUsers);
    socket.on("user:joined", onJoined);
    socket.on("user:left", onLeft);
    socket.on("draw:start", onDrawStart);
    socket.on("draw:move", onDrawMove);
    socket.on("draw:end", onDrawEnd);
    socket.on("cursor:move", onCursor);
    socket.on("cursor:leave", onCursorLeave);
    socket.on("board:clear", onClear);
    socket.on("board:state", onState);
    socket.on("board:undo", onUndo);
    socket.on("board:redo", onRedo);
    const onConnectError = () => {
      setStatus("error");
      push("Cannot reach the server. Is the backend running?", "error");
    };
    socket.on("connect_error", onConnectError);

    if (socket.connected) join();
    else socket.connect();

    return () => {
      cancelled = true;
      socket.emit("room:leave");
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("users:list", onUsers);
      socket.off("user:joined", onJoined);
      socket.off("user:left", onLeft);
      socket.off("draw:start", onDrawStart);
      socket.off("draw:move", onDrawMove);
      socket.off("draw:end", onDrawEnd);
      socket.off("cursor:move", onCursor);
      socket.off("cursor:leave", onCursorLeave);
      socket.off("board:clear", onClear);
      socket.off("board:state", onState);
      socket.off("board:undo", onUndo);
      socket.off("board:redo", onRedo);
      socket.off("connect_error", onConnectError);
    };
  }, [roomId, username, userId, onLeave, push]);

  function handleDrawStart(point) {
    const stroke = {
      id: makeStrokeId(),
      userId,
      tool,
      color,
      lineWidth,
      points: [point],
    };
    currentStrokeId.current = stroke.id;
    moveBuffer.current = [];
    redoRef.current = [];
    connectSocket().emit("draw:start", {
      strokeId: stroke.id,
      tool,
      color,
      lineWidth,
      point,
    });
    return stroke;
  }

  function handleDrawMove(point) {
    moveBuffer.current.push(point);
    emitBufferedMoves();
  }

  function handleDrawEnd(stroke) {
    flushMovesNow();
    connectSocket().emit("draw:end", { strokeId: stroke.id });
    undoRef.current.push(stroke);
    currentStrokeId.current = null;
    bumpHistory();
  }

  function handleUndo() {
    const stroke = undoRef.current.pop();
    if (!stroke) return;
    redoRef.current.push(stroke);
    canvasRef.current?.removeStroke(stroke.id);
    connectSocket().emit("board:undo", { strokeId: stroke.id });
    bumpHistory();
  }

  function handleRedo() {
    const stroke = redoRef.current.pop();
    if (!stroke) return;
    undoRef.current.push(stroke);
    canvasRef.current?.addStroke(stroke);
    connectSocket().emit("board:redo", { stroke });
    bumpHistory();
  }

  function handleClear() {
    if (!window.confirm("Clear the board for everyone in this room?")) return;
    canvasRef.current?.clear();
    undoRef.current = [];
    redoRef.current = [];
    connectSocket().emit("board:clear");
    bumpHistory();
  }

  function handleDownload() {
    const url = canvasRef.current?.exportPng();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `scribbleboard-${roomId}.png`;
    a.click();
    push("Board downloaded", "success");
  }

  async function handleShare() {
    const url = `${window.location.origin}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      push("Link copied!", "success");
    } catch {
      push(url, "info");
    }
  }

  const statusLabel = {
    connecting: "Connecting…",
    connected: "Live",
    disconnected: "Reconnecting…",
    error: "Server unavailable",
  }[status];

  return (
    <div className="relative h-screen overflow-hidden bg-slate-100 scribble-grid dark:bg-[#0d0c12]">
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-start justify-between p-4">
        <div className="pointer-events-auto rounded-2xl border border-white/60 bg-white/90 px-4 py-3 shadow-float backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90">
          <p className="font-scribble text-2xl leading-none text-indigo-600">ScribbleBoard</p>
          <p className="mt-1 text-xs font-semibold tracking-wide text-slate-500">
            Room {roomId} · {statusLabel}
          </p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => onLeave?.()}
            className="h-10 rounded-full bg-white/90 px-4 text-sm font-semibold shadow-sm dark:bg-slate-900/90"
          >
            Leave
          </button>
        </div>
      </header>

      <div className="absolute inset-0 pt-24 pb-28">
        <div className="relative mx-auto h-full w-[min(96vw,1400px)] overflow-hidden rounded-[28px] border border-slate-200 shadow-2xl dark:border-white/10">
          <Canvas
            ref={canvasRef}
            tool={tool}
            color={color}
            lineWidth={lineWidth}
            disabled={status === "error"}
            onDrawStart={handleDrawStart}
            onDrawMove={handleDrawMove}
            onDrawEnd={handleDrawEnd}
            onCursorMove={sendCursor}
          />
          <CursorOverlay cursors={cursors} boardRect />
        </div>
      </div>

      <div className="absolute right-4 top-24 z-20">
        <UsersPanel users={users} selfId={userId} />
      </div>

      <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
        <Toolbar
          tool={tool}
          color={color}
          lineWidth={lineWidth}
          canUndo={undoRef.current.length > 0}
          canRedo={redoRef.current.length > 0}
          onTool={setTool}
          onColor={setColor}
          onWidth={setLineWidth}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onDownload={handleDownload}
          onShare={handleShare}
        />
      </div>
    </div>
  );
}
