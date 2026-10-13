export default function CursorOverlay({ cursors, boardRect }) {
  if (!boardRect) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Object.values(cursors).map((cursor) => {
        const left = (cursor.x / 1920) * 100;
        const top = (cursor.y / 1080) * 100;
        return (
          <div
            key={cursor.userId}
            className="absolute -translate-x-1 -translate-y-1 transition-transform duration-75"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill={cursor.color}>
              <path d="M1 1l5 16 3-6 6-3L1 1z" />
            </svg>
            <span
              className="ml-3 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow"
              style={{ background: cursor.color }}
            >
              {cursor.username}
            </span>
          </div>
        );
      })}
    </div>
  );
}
