"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { useToast } from "../../lib/toast-context";
import { getBookDownload, type BookItem } from "../../lib/api";
import EpubViewer from "../../components/epub-viewer";

export default function ReaderPage({ params }: { params: { id: string } }) {
  const auth = useAuth();
  const toast = useToast();
  const [item, setItem] = useState<BookItem | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (auth.loading) return;
      if (!params.id || params.id === "undefined") {
        setError("Invalid book link. Try opening it from the library again.");
        setLoading(false);
        return;
      }
      if (!auth.token) {
        setError("Please log in to read");
        return;
      }
      setError(null);
      setLoading(true);
      try {
        const { item, url } = await getBookDownload(params.id, auth.token);
        setItem(item);
        setUrl(url);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to open";
        if (
          typeof msg === "string" &&
          msg.includes("404") &&
          msg.includes("Book not found")
        ) {
          setError("Book not found. It may have been removed.");
          toast.error("Book not found", "Reader error");
        } else {
          setError(msg);
          toast.error(msg, "Reader error");
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [auth.loading, auth.token, params.id, toast]);

  const isPdf = item?.contentType?.startsWith("application/pdf");
  const isEpub = item?.contentType?.includes("epub");

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Reader</h1>
            {item ? (
              <p className="text-sm text-zinc-600">
                {item.title} · {item.author}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
            >
              Back
            </Link>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Open in new tab
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
            Loading…
          </div>
        ) : null}

        {!loading && item && url ? (
          isPdf ? (
            <iframe
              src={url}
              className="h-[80vh] w-full rounded border border-zinc-200 bg-white"
              title="PDF Reader"
            />
          ) : isEpub ? (
            <EpubViewer url={url} />
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
              Preview not supported for this format. You can download and open
              it locally.
            </div>
          )
        ) : null}
        {!loading && !item && error ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
            Try going back and refreshing your library. If the book was deleted
            or the environment was reset, please re-upload it.
          </div>
        ) : null}
      </main>
    </div>
  );
}
