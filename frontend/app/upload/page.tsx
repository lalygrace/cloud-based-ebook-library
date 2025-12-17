"use client";

import Link from "next/link";
import { useState } from "react";
import { uploadBook } from "../lib/api";

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = title.trim() && author.trim() && file && !busy;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError("Please select a file");
      return;
    }

    setBusy(true);
    try {
      await uploadBook({
        title: title.trim(),
        author: author.trim(),
        genre: genre.trim() || undefined,
        file,
      });
      setSuccess("Upload complete");
      setTitle("");
      setAuthor("");
      setGenre("");
      setFile(null);

      const input = document.getElementById("file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Upload E‑Book
            </h1>
            <p className="text-sm text-zinc-600">
              PDF/EPUB stored in S3, metadata in DynamoDB
            </p>
          </div>
          <Link
            href="/"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
          >
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {success}
          </div>
        ) : null}

        <form
          onSubmit={onSubmit}
          className="rounded-lg border border-zinc-200 bg-white p-6"
        >
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cloud Architecture 101"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Author</label>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Jane Doe"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Genre (optional)</label>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g. DevOps"
              />
            </div>

            <div>
              <label className="text-sm font-medium">File (PDF/EPUB)</label>
              <input
                id="file"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                type="file"
                accept=".pdf,.epub,application/pdf,application/epub+zip"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
              <p className="mt-1 text-xs text-zinc-500">Demo limit: 10MB</p>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {busy ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
