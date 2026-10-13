import { useTheme } from "../hooks/useTheme.jsx";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition hover:scale-105 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 ${className}`}
      aria-label="Toggle color theme"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
