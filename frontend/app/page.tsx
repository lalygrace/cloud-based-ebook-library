"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  deleteBook,
  getBookDownload,
  listBooks,
  type BookItem,
} from "./lib/api";

export default function Home() {
  const [items, setItems] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"user" | "admin">("user");

  const hasApiBase = useMemo(
    () => Boolean(process.env.NEXT_PUBLIC_API_BASE_URL),
    []
  );

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const data = await listBooks();
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
    void refresh();
  }, [hasApiBase]);

  async function onDownload(bookId: string) {
    setError(null);
    try {
      const { url } = await getBookDownload(bookId);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  }

  async function onDelete(bookId: string) {
    setError(null);
    try {
      await deleteBook(bookId, role);
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
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              Role
              <select
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as "user" | "admin")}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <Link
              href="/upload"
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Upload
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {!hasApiBase ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Missing API base URL</p>
            <p className="mt-1">
              Run{" "}
              <span className="font-mono">./scripts/localstack-api-env.sh</span>{" "}
              to generate
              <span className="font-mono"> frontend/.env.local</span>.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
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
                    <button
                      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs hover:bg-zinc-50"
                      onClick={() => void onDelete(b.bookId)}
                      title={
                        role === "admin" ? "Delete" : "Requires admin role"
                      }
                    >
                      Delete
                    </button>
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
