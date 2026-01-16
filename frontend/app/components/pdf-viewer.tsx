"use client";

import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// Use a bundled worker so this works in Next dev/prod.
// (react-pdf recommends setting this explicitly)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type Props = {
  url: string;
  title?: string;
  downloadUrl?: string;
};

export default function PdfViewer({ url, title, downloadUrl }: Props) {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [error, setError] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    setError(null);
    setLoadingPdf(true);
    setPdfData(null);
    setNumPages(null);
    setPage(1);

    fetch(url, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Failed to fetch PDF (${res.status})`);
        }
        return res.arrayBuffer();
      })
      .then((buf) => {
        setPdfData(buf);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load PDF");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPdf(false);
      });

    return () => controller.abort();
  }, [url]);

  // Render from in-memory data to avoid PDF.js doing HEAD/range probing
  // (some proxies respond unexpectedly to those requests).
  const file = useMemo(() => {
    if (!pdfData) return null;
    return { data: pdfData } as const;
  }, [pdfData]);

  function clampPage(next: number, total: number | null) {
    if (!total) return Math.max(1, next);
    return Math.min(Math.max(1, next), total);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-zinc-900">
            {title || "PDF"}
          </div>
          <div className="text-xs text-zinc-500">
            {numPages ? `${page} / ${numPages} pages` : "Loading…"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs hover:bg-zinc-50 disabled:opacity-50"
            onClick={() => setPage((p) => clampPage(p - 1, numPages))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <button
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs hover:bg-zinc-50 disabled:opacity-50"
            onClick={() =>
              setPage((p) =>
                clampPage(p + 1, numPages ?? Number.MAX_SAFE_INTEGER)
              )
            }
            disabled={!!numPages && page >= numPages}
          >
            Next
          </button>

          <div className="mx-1 h-6 w-px bg-zinc-200" />

          <button
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs hover:bg-zinc-50"
            onClick={() =>
              setScale((s) => Math.max(0.6, Number((s - 0.1).toFixed(2))))
            }
          >
            −
          </button>
          <div className="w-14 text-center text-xs text-zinc-700">
            {Math.round(scale * 100)}%
          </div>
          <button
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs hover:bg-zinc-50"
            onClick={() =>
              setScale((s) => Math.min(2.0, Number((s + 0.1).toFixed(2))))
            }
          >
            +
          </button>

          {downloadUrl ? (
            <a
              href={downloadUrl}
              className="ml-2 rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Download
            </a>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="m-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="flex justify-center bg-zinc-100 p-3">
        {loadingPdf ? (
          <div className="w-full rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
            Loading PDF…
          </div>
        ) : file ? (
          <Document
            file={file}
            onLoadSuccess={(doc) => {
              setNumPages(doc.numPages);
              setPage((p) => clampPage(p, doc.numPages));
            }}
            onLoadError={(e) => {
              setError(e instanceof Error ? e.message : "Failed to load PDF");
            }}
          >
            <Page
              pageNumber={page}
              scale={scale}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              className="shadow"
            />
          </Document>
        ) : null}
      </div>
    </div>
  );
}
