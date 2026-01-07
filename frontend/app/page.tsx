"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./lib/auth-context";
import {
  deleteBook,
  getBookDownload,
  listBooks,
  type BookItem,
} from "./lib/api";

export default function Home() {
  const router = useRouter();
  const auth = useAuth();
  const [items, setItems] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasApiBase = useMemo(() => true, []);

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      if (!auth.token) throw new Error("Not authenticated");
      const data = await listBooks(auth.token);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

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
  }, [hasApiBase, auth.loading, auth.token, refresh]);

  async function onDownload(bookId: string) {
    setError(null);
    try {
      if (!auth.token) throw new Error("Not authenticated");
      const { url } = await getBookDownload(bookId, auth.token);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  }

  async function onDelete(bookId: string) {
    setError(null);
    try {
      if (!auth.token) throw new Error("Not authenticated");
      await deleteBook(bookId, auth.token);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              E‑Book Library
            </h1>
            <p className="text-sm text-zinc-600">LocalStack serverless demo</p>
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
          <button
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
            onClick={() => void refresh()}
            disabled={!hasApiBase || loading}
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="grid grid-cols-12 gap-2 border-b border-zinc-200 px-4 py-3 text-xs font-medium text-zinc-600">
            <div className="col-span-5">Title</div>
            <div className="col-span-3">Author</div>
            <div className="col-span-2">Uploaded</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-sm text-zinc-600">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-zinc-600">
              No books yet. Upload one.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200">
              {items.map((b) => (
                <li
                  key={b.bookId}
                  className="grid grid-cols-12 gap-2 px-4 py-4 text-sm"
                >
                  <div className="col-span-5">
                    <div className="font-medium">{b.title}</div>
                    <div className="text-xs text-zinc-500">
                      {b.originalFileName}
                    </div>
                  </div>
                  <div className="col-span-3 text-zinc-700">{b.author}</div>
                  <div className="col-span-2 text-xs text-zinc-600">
                    {new Date(b.uploadedAt).toLocaleString()}
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <button
                      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs hover:bg-zinc-50"
                      onClick={() => void onDownload(b.bookId)}
                    >
                      Download
                    </button>
                    {auth.user?.role === "admin" ? (
                      <button
                        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs hover:bg-zinc-50"
                        onClick={() => void onDelete(b.bookId)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
