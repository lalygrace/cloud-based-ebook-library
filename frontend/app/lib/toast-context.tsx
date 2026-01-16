"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  title?: string;
  message: string;
  type?: ToastType;
  durationMs?: number;
};

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const ToastContext = createContext<{
  add(toast: Omit<Toast, "id">): void;
  success(message: string, title?: string): void;
  error(message: string, title?: string): void;
  info(message: string, title?: string): void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout);
    },
    []
  );

  const api = useMemo(
    () => ({
      add(toast: Omit<Toast, "id">) {
        const id = uuid();
        const t: Toast = {
          id,
          type: toast.type ?? "info",
          durationMs: toast.durationMs ?? 3000,
          ...toast,
        };
        setToasts((prev) => [t, ...prev].slice(0, 6));
        timers.current[id] = setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== id));
          delete timers.current[id];
        }, t.durationMs);
      },
      success(message: string, title?: string) {
        api.add({ message, title, type: "success" });
      },
      error(message: string, title?: string) {
        api.add({ message, title, type: "error", durationMs: 5000 });
      },
      info(message: string, title?: string) {
        api.add({ message, title, type: "info" });
      },
    }),
    []
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            "pointer-events-auto rounded-lg border p-3 shadow-sm " +
            (t.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : t.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-zinc-200 bg-white text-zinc-800")
          }
        >
          {t.title ? (
            <div className="text-sm font-medium">{t.title}</div>
          ) : null}
          <div className="text-sm">{t.message}</div>
        </div>
      ))}
    </div>
  );
}
