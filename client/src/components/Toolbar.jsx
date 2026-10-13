const tools = [
  { id: "pen", label: "Pen", icon: "✎" },
  { id: "eraser", label: "Eraser", icon: "⌫" },
];

const swatches = ["#111827", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function Toolbar({
  tool,
  color,
  lineWidth,
  canUndo,
  canRedo,
  onTool,
  onColor,
  onWidth,
  onUndo,
  onRedo,
  onClear,
  onDownload,
  onShare,
}) {
  return (
    <div className="pointer-events-auto flex max-w-[min(96vw,920px)] flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/60 bg-white/90 px-3 py-2 shadow-float backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90">
      {tools.map((item) => (
        <button
          key={item.id}
          type="button"
          title={item.label}
          onClick={() => onTool(item.id)}
          className={`h-10 rounded-xl px-3 text-sm font-semibold transition ${
            tool === item.id
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/20"
          }`}
        >
          {item.icon} {item.label}
        </button>
      ))}

      <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block dark:bg-white/10" />

      <button
        type="button"
        title="Undo"
        disabled={!canUndo}
        onClick={onUndo}
        className="h-10 rounded-xl bg-slate-100 px-3 text-sm font-semibold disabled:opacity-40 dark:bg-white/10"
      >
        Undo
      </button>
      <button
        type="button"
        title="Redo"
        disabled={!canRedo}
        onClick={onRedo}
        className="h-10 rounded-xl bg-slate-100 px-3 text-sm font-semibold disabled:opacity-40 dark:bg-white/10"
      >
        Redo
      </button>

      <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block dark:bg-white/10" />

      <label className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold dark:bg-white/10">
        Color
        <input
          type="color"
          value={color}
          onChange={(e) => onColor(e.target.value)}
          className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent"
        />
      </label>

      <div className="hidden items-center gap-1 md:flex">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => onColor(c)}
            className={`h-6 w-6 rounded-full border border-black/10 ${color === c ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900" : ""}`}
            style={{ background: c }}
          />
        ))}
      </div>

      <label className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold dark:bg-white/10">
        Size
        <input
          type="range"
          min="2"
          max="32"
          value={lineWidth}
          onChange={(e) => onWidth(Number(e.target.value))}
        />
      </label>

      <button type="button" onClick={onClear} className="h-10 rounded-xl bg-rose-50 px-3 text-sm font-semibold text-rose-600 dark:bg-rose-500/20 dark:text-rose-200">
        Clear
      </button>
      <button type="button" onClick={onDownload} className="h-10 rounded-xl bg-slate-100 px-3 text-sm font-semibold dark:bg-white/10">
        Download
      </button>
      <button type="button" onClick={onShare} className="h-10 rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white">
        Share
      </button>
    </div>
  );
}
