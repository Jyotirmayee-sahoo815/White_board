export default function UsersPanel({ users, selfId }) {
  return (
    <aside className="pointer-events-auto w-[min(92vw,240px)] rounded-2xl border border-white/60 bg-white/90 p-4 shadow-float backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Online</h2>
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200">
          {users.length}
        </span>
      </div>
      <ul className="space-y-2">
        {users.map((user) => (
          <li key={user.socketId || user.id} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: user.color }} />
            <span className="truncate font-medium">
              {user.username}
              {user.id === selfId ? " (you)" : ""}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
