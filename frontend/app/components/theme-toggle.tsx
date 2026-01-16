"use client";

export default function ThemeToggle() {
  return (
    <button
      onClick={() => {
        const el = document.documentElement;
        const isDark = el.getAttribute("data-theme") === "dark";
        const next = isDark ? "light" : "dark";
        el.setAttribute("data-theme", next);
        try {
          localStorage.setItem("theme", next);
        } catch {}
      }}
      className="fixed bottom-4 right-4 z-50 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50"
      aria-label="Toggle theme"
    >
      Theme
    </button>
  );
}
