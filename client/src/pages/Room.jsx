import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Whiteboard from "../components/Whiteboard.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { getRoomApi } from "../services/api.js";
import { isValidRoomId, normalizeRoomId, sanitizeUsername, USERNAME_KEY } from "../utils/helpers.js";
import { useToast } from "../hooks/useToast.jsx";

export default function Room() {
  const { roomId: rawId } = useParams();
  const roomId = normalizeRoomId(rawId);
  const location = useLocation();
  const navigate = useNavigate();
  const { push } = useToast();
  const [username, setUsername] = useState(
    () => location.state?.username || sessionStorage.getItem(USERNAME_KEY) || ""
  );
  const [joined, setJoined] = useState(Boolean(location.state?.username || sessionStorage.getItem(USERNAME_KEY)));
  const [checking, setChecking] = useState(true);
  const [invalid, setInvalid] = useState("");

  useEffect(() => {
    let alive = true;
    async function check() {
      if (!isValidRoomId(roomId)) {
        setInvalid("That room ID is not valid.");
        setChecking(false);
        return;
      }
      try {
        await getRoomApi(roomId);
        if (alive) setChecking(false);
      } catch (err) {
        if (!alive) return;
        setInvalid(err.message || "Room not found.");
        setChecking(false);
      }
    }
    check();
    return () => {
      alive = false;
    };
  }, [roomId]);

  const leave = useCallback(
    (message) => {
      if (message) push(message, "error");
      navigate("/");
    },
    [navigate, push]
  );

  function submitName(event) {
    event.preventDefault();
    const name = sanitizeUsername(username);
    if (!name) {
      push("Enter a username to join this room.", "error");
      return;
    }
    sessionStorage.setItem(USERNAME_KEY, name);
    setUsername(name);
    setJoined(true);
  }

  if (checking) {
    return (
      <Screen>
        <p className="text-slate-500">Opening room…</p>
      </Screen>
    );
  }

  if (invalid) {
    return (
      <Screen>
        <h1 className="font-display text-3xl font-bold">Room unavailable</h1>
        <p className="mt-2 text-slate-500">{invalid}</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-6 rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white"
        >
          Back home
        </button>
      </Screen>
    );
  }

  if (!joined) {
    return (
      <Screen>
        <h1 className="font-display text-3xl font-bold">Join {roomId}</h1>
        <p className="mt-2 text-slate-500">Enter a name to start drawing with everyone in this room.</p>
        <form onSubmit={submitName} className="mt-6 space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-indigo-500 focus:ring-2 dark:border-white/10 dark:bg-slate-950"
          />
          <button type="submit" className="w-full rounded-2xl bg-indigo-600 py-3 font-semibold text-white">
            Join whiteboard
          </button>
        </form>
      </Screen>
    );
  }

  return <Whiteboard roomId={roomId} username={username} onLeave={leave} />;
}

function Screen({ children }) {
  return (
    <div className="scribble-grid flex min-h-screen items-center justify-center px-6">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white/90 p-8 text-center shadow-float dark:border-white/10 dark:bg-slate-900/90">
        {children}
      </div>
    </div>
  );
}
