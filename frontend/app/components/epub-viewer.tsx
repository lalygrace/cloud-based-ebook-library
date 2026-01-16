"use client";

import { useEffect, useRef, useState } from "react";
import ePub, { Book, Rendition } from "epubjs";

type Props = { url: string };

function isHttpUrl(s: string): boolean {
  return s.startsWith("http://") || s.startsWith("https://");
}

export default function EpubViewer({ url }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objUrl: string | null = null;
    let book: Book | null = null;
    let rendition: Rendition | null = null;

    async function init() {
      setError(null);
      setLoading(true);
      try {
        const fetchUrl = isHttpUrl(url)
          ? `/api/blob?disposition=inline&contentType=${encodeURIComponent(
              "application/epub+zip"
            )}&fileName=${encodeURIComponent("book.epub")}&url=${encodeURIComponent(
              url
            )}`
          : url;

        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`Failed to fetch EPUB (${res.status})`);
        const blob = await res.blob();
        objUrl = URL.createObjectURL(blob);
        book = ePub(objUrl);
        if (!containerRef.current) throw new Error("Viewer not ready");
        rendition = book.renderTo(containerRef.current, {
          width: "100%",
          height: "100%",
          spread: "auto",
        });
        await rendition.display();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to open EPUB");
      } finally {
        setLoading(false);
      }
    }

    void init();

    return () => {
      try {
        rendition?.destroy();
        // @ts-expect-error Optional method in some builds
        book?.destroy?.();
      } catch {}
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [url]);

  return (
    <div className="flex h-[80vh] w-full flex-col">
      {error ? (
        <div className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden rounded border border-zinc-200 bg-white"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-600">
            Loading EPUB…
          </div>
        ) : null}
      </div>
    </div>
  );
}
