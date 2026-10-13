export default function Toast({ toast, onClose }) {
  const tones = {
    info: "bg-slate-900 text-white dark:bg-white dark:text-slate-900",
    success: "bg-emerald-600 text-white",
    error: "bg-rose-600 text-white",
  };

  return (
    <button
      type="button"
      onClick={onClose}
      className={`pointer-events-auto rounded-2xl px-4 py-3 text-sm font-medium shadow-float ${tones[toast.type] || tones.info}`}
    >
      {toast.message}
    </button>
  );
}
