"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./lib/auth-context";
import {
  deleteBook,
  getBookDownload,
  listBooks,
  type BookItem,
} from "./lib/api";
import { useToast } from "./lib/toast-context";
import { GENRES } from "./lib/genres";

export default function Home() {
  const router = useRouter();
  const auth = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<BookItem[]>([]);
  const [lastKey, setLastKey] = useState<unknown | null>(null);
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasApiBase = true;

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (!auth.token) throw new Error("Not authenticated");
      const { items, lastKey } = await listBooks(auth.token, {
        q: q.trim() || undefined,
        genre: genre.trim() || undefined,
        limit: 20,
      });
      setItems(items);
      setLastKey(lastKey ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [auth.token, genre, q]);

  // We intentionally don't depend on `refresh` to avoid retriggering on each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hasApiBase) {
      setLoading(false);
      return;
    }
    if (!auth.loading && !auth.token) {
      setLoading(false);
      return;
    }
    if (!auth.loading && auth.token) void refresh();
  }, [hasApiBase, auth.loading, auth.token]);

  async function onDownload(bookId: string) {
    setError(null);
    try {
      if (!auth.token) throw new Error("Not authenticated");
      const { url } = await getBookDownload(bookId, auth.token);
      // Try HEAD first for a friendlier error if the object is missing
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (!res.ok) throw new Error(`Download unavailable (${res.status})`);
      } catch {
        throw new Error("File not found in storage. Please re-upload.");
      }
      window.location.href = url;
      toast.info("Your download will start", "Preparing file");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Download failed";
      setError(msg);
      toast.error(msg, "Download failed");
    }
  }

  async function loadMore() {
    if (loading || !lastKey) return;
    setLoading(true);
    try {
      if (!auth.token) throw new Error("Not authenticated");
      const { items: more, lastKey: nextKey } = await listBooks(auth.token, {
        q: q.trim() || undefined,
        genre: genre.trim() || undefined,
        limit: 20,
        lastKey,
      });
      setItems((prev) => [...prev, ...more]);
      setLastKey(nextKey ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load more failed");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(bookId: string) {
    setError(null);
    try {
      if (!auth.token) throw new Error("Not authenticated");
      if (!window.confirm("Delete this book?")) return;
      await deleteBook(bookId, auth.token);
      toast.success("Book deleted");
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      setError(msg);
      toast.error(msg, "Delete failed");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-zinc-900"></div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                E‑Book Library
              </h1>
              <p className="text-xs text-zinc-600">
                LocalStack · Serverless · Next.js
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {auth.user ? (
              <div className="text-sm text-zinc-600">
                <span className="font-medium text-zinc-900">
                  {auth.user.name}
                </span>
                <span className="ml-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
                  {auth.user.role}
                </span>
              </div>
            ) : null}

            {auth.user ? (
              <>
                <Link
                  href="/upload"
                  className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Upload
                </Link>
                <button
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                  onClick={() => {
                    auth.logout();
                    router.push("/login");
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Your Cloud Library
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Upload, store, and securely access your e‑books.
              </p>
            </div>
            {auth.user ? (
              <Link
                href="/upload"
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Upload a book
              </Link>
            ) : (
              <div className="text-sm text-zinc-600">Sign in to upload</div>
            )}
          </div>
        </section>
        {null}

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {!auth.loading && !auth.user ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
            <p className="font-medium">Sign in to view your library</p>
            <p className="mt-1 text-zinc-600">
              Create an account or log in to upload and access your e‑books.
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Books</h2>
          <div className="flex flex-wrap gap-2">
            <input
              className="w-48 rounded-md border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Search title/author"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="w-40 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              <option value="">All genres</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <button
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
              onClick={() => void refresh()}
              disabled={!hasApiBase || loading}
            >
              Apply
            </button>
          </div>
        </div>

        <div className="mt-4">
          {loading && items.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
              No books yet. Upload one.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((b) => (
                <div
                  key={b.bookId}
                  className="group rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="line-clamp-1 text-sm font-semibold text-zinc-900">
                        {b.title}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-xs text-zinc-600">
                        {b.author}
                      </p>
                    </div>
                    {b.genre ? (
                      <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
                        {b.genre}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-1 text-xs text-zinc-500">
                    {b.originalFileName}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {new Date(b.uploadedAt).toLocaleString()}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs hover:bg-zinc-50"
                      onClick={() => void onDownload(b.bookId)}
                    >
                      Download
                    </button>
                    {auth.user?.role === "admin" ? (
                      <button
                        className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                        onClick={() => void onDelete(b.bookId)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
          {items.length > 0 ? (
            <div className="mt-4 flex justify-center">
              <button
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                disabled={!lastKey || loading}
                onClick={() => void loadMore()}
              >
                {lastKey ? (loading ? "Loading…" : "Load more") : "End"}
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
