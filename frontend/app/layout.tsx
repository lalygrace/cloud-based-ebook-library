import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./lib/auth-context";
import { ToastProvider } from "./lib/toast-context";

export const metadata: Metadata = {
  title: "E‑Book Library",
  description: "Cloud-based E‑Book Library demo (LocalStack + Serverless)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  function ThemeToggle() {
    return (
      <button
        onClick={() => {
          const el = document.documentElement;
          const isDark = el.getAttribute("data-theme") === "dark";
          el.setAttribute("data-theme", isDark ? "light" : "dark");
          try {
            localStorage.setItem("theme", isDark ? "light" : "dark");
          } catch {}
        }}
        className="fixed bottom-4 right-4 z-50 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50"
        aria-label="Toggle theme"
      >
        Theme
      </button>
    );
  }

  return (
    <html lang="en">
      <body className={`antialiased`}>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
        <ThemeToggle />
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const t = localStorage.getItem('theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch {} })();`,
          }}
        />
      </body>
    </html>
  );
}
