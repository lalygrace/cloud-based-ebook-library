import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./lib/auth-context";
import { ToastProvider } from "./lib/toast-context";
import ThemeToggle from "./components/theme-toggle";

export const metadata: Metadata = {
  title: "E‑Book Library",
  description: "Cloud-based E‑Book Library demo (LocalStack + Serverless)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
