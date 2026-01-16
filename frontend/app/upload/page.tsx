"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { uploadBook } from "../lib/api";
import { GENRES } from "../lib/genres";

export default function UploadPage() {
  const router = useRouter();
  const auth = useAuth();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState(GENRES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit =
    title.trim() &&
    author.trim() &&
    genre.trim() &&
    file &&
    !busy &&
    Boolean(auth.token);

  useEffect(() => {
    if (!auth.loading && !auth.token) router.replace("/login");
  }, [auth.loading, auth.token, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!auth.token) {
      setError("Please log in");
      router.push("/login");
      return;
    }

    if (!file) {
      setError("Please select a file");
      return;
    }

    setBusy(true);
    setProgress(5);
    try {
      // simulate progress while encoding file (simple UX improvement)
      const interval = setInterval(() => {
        setProgress((p) => Math.min(90, p + 5));
      }, 200);

      await uploadBook({
        title: title.trim(),
        author: author.trim(),
        genre: genre.trim(),
        file,
        token: auth.token,
      });
      clearInterval(interval);
      setProgress(100);
      setSuccess("Upload complete");
      toast.success("Upload complete", "Success");
      setTimeout(() => router.push("/"), 300);
      setTitle("");
      setAuthor("");
      setGenre(GENRES[0]);
      setFile(null);

      const input = document.getElementById("file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
      toast.error(msg, "Upload failed");
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(0), 800);
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
        {auth.loading ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
            Loading…
          </div>
        ) : null}
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
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) setFile(f);
          }}
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
                placeholder="e.g. Abebe Chala"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Genre</label>
              <select
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                required
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
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
              <p className="mt-1 text-xs text-zinc-500">
                Drag & drop supported. Demo limit: 10MB
              </p>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {busy ? "Uploading…" : "Upload"}
            </button>
            {busy || progress > 0 ? (
              <div className="mt-2 h-2 w-full rounded bg-zinc-200">
                <div
                  className="h-2 rounded bg-zinc-900 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
          </div>
        </form>
      </main>
    </div>
  );
}
