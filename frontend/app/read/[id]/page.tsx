"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useToast } from "../../lib/toast-context";
import { getBook, type BookItem } from "../../lib/api";
import EpubViewer from "../../components/epub-viewer";
import PdfViewer from "../../components/pdf-viewer";

export default function ReaderPage() {
  const auth = useAuth();
  const toast = useToast();
  const params = useParams<{ id?: string }>();
  const [item, setItem] = useState<BookItem | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastRequestedId = useRef<string | null>(null);

  useEffect(() => {
    const bookId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
    async function load() {
      if (auth.loading) return;
      if (!bookId || bookId === "undefined") {
        setError("Invalid book link. Try opening it from the library again.");
        setLoading(false);
        return;
      }
      if (!auth.token) {
        setError("Please log in to read");
        return;
      }
      if (lastRequestedId.current === bookId && url) return;
      lastRequestedId.current = bookId;
      setError(null);
      setLoading(true);
      try {
        const { item, url } = await getBook(bookId, auth.token, {
          disposition: "inline",
        });
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
        } else if (
          typeof msg === "string" &&
          msg.includes("410") &&
          msg.toLowerCase().includes("re-upload")
        ) {
          setError(
            "File not found in storage. This can happen after restarting LocalStack. Please re-upload the book."
          );
          toast.error("File missing in storage", "Reader error");
        } else {
          setError(msg);
          toast.error(msg, "Reader error");
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [auth.loading, auth.token, params, toast, url]);

  useEffect(() => {
    if (!item || !url) {
      setViewUrl(null);
      return;
    }

    const fileName = encodeURIComponent(item.originalFileName || "file");
    const contentType = encodeURIComponent(item.contentType || "");
    const proxied = `/api/blob?disposition=inline&contentType=${contentType}&fileName=${fileName}&url=${encodeURIComponent(
      url
    )}`;

    // Always render via same-origin proxy to avoid:
    // - CORS issues when fetching LocalStack URLs
    // - attachment Content-Disposition forcing downloads in iframes
    setViewUrl(proxied);
  }, [item, url]);

  const isPdf = item?.contentType?.startsWith("application/pdf");
  const isEpub = item?.contentType?.includes("epub");

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-50 to-white text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">
              Reader
            </h1>
            {item ? (
              <p className="truncate text-sm text-zinc-600">
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
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
              >
                Open original
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
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
            <PdfViewer
              url={viewUrl ?? url}
              title={item.originalFileName}
              downloadUrl={`/api/proxy/books/${encodeURIComponent(
                item.bookId
              )}?disposition=attachment`}
            />
          ) : isEpub ? (
            <EpubViewer url={viewUrl ?? url} />
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
