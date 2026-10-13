import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { createRoomApi, getRoomApi } from "../services/api.js";
import { normalizeRoomId, sanitizeUsername, USERNAME_KEY } from "../utils/helpers.js";
import { useToast } from "../hooks/useToast.jsx";

export default function Home() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [username, setUsername] = useState(() => sessionStorage.getItem(USERNAME_KEY) || "");
  const [roomId, setRoomId] = useState("");
  const [busy, setBusy] = useState(false);

  function requireName() {
    const name = sanitizeUsername(username);
    if (!name) {
      push("Enter a username (1–20 letters, numbers, spaces).", "error");
      return null;
    }
    sessionStorage.setItem(USERNAME_KEY, name);
    return name;
  }

  async function handleCreate(event) {
    event.preventDefault();
    const name = requireName();
    if (!name) return;
    setBusy(true);
    try {
      const data = await createRoomApi();
      navigate(`/room/${data.roomId}`, { state: { username: name } });
    } catch (err) {
      push(err.message || "Could not create a room. Is the server running?", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(event) {
    event.preventDefault();
    const name = requireName();
    if (!name) return;
    const id = normalizeRoomId(roomId);
    if (!id) {
      push("Enter a room ID to join.", "error");
      return;
    }
    setBusy(true);
    try {
      await getRoomApi(id);
      navigate(`/room/${id}`, { state: { username: name } });
    } catch (err) {
      push(err.message || "That room does not exist.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="scribble-grid min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-lg text-white shadow-float">
            ✦
          </div>
          <span className="font-scribble text-3xl text-indigo-600 dark:text-indigo-400">ScribbleBoard</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section>
          <p className="mb-4 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
            Real-time whiteboard
          </p>
          <h1 className="font-display text-5xl font-bold leading-tight text-slate-900 dark:text-white md:text-6xl">
            Draw. Collaborate. Create — together in real time.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">
            A shared canvas for sketches, ideas, and messy first drafts. Open a room, invite friends, and watch every
            stroke appear instantly.
          </p>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-float backdrop-blur-md dark:border-white/10 dark:bg-slate-900/80">
          <label className="mb-4 block text-sm font-semibold text-slate-600 dark:text-slate-300">
            Your name
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              placeholder="e.g. Jyotirmayee"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none ring-indigo-500 focus:ring-2 dark:border-white/10 dark:bg-slate-950"
            />
          </label>

          <form onSubmit={handleCreate} className="mb-4">
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-indigo-600 py-3.5 text-base font-semibold text-white shadow-float transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {busy ? "Working…" : "Create Room"}
            </button>
          </form>

          <div className="relative my-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            <span className="relative z-10 bg-white px-3 dark:bg-slate-900">or join a room</span>
            <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-slate-200 dark:bg-white/10" />
          </div>

          <form onSubmit={handleJoin} className="space-y-3">
            <input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="Room ID"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 tracking-[0.3em] outline-none ring-indigo-500 focus:ring-2 dark:border-white/10 dark:bg-slate-950"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl border border-slate-200 py-3.5 text-base font-semibold transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/5"
            >
              Join Room
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
