export type BookItem = {
  bookId: string;
  title: string;
  author: string;
  genre?: string;
  s3Key: string;
  contentType: string;
  originalFileName: string;
  uploadedAt: string;
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function apiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_BASE_URL. Run ./scripts/localstack-api-env.sh after starting LocalStack."
    );
  }
  return base.replace(/\/$/, "");
}

export async function listBooks(): Promise<BookItem[]> {
  const res = await fetch(`${apiBase()}/books`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`List failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { items: BookItem[] };
  return data.items;
}

export async function uploadBook(input: {
  title: string;
  author: string;
  genre?: string;
  file: File;
}): Promise<BookItem> {
  const buffer = await input.file.arrayBuffer();
  const fileBase64 = arrayBufferToBase64(buffer);

  const res = await fetch(`${apiBase()}/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      author: input.author,
      genre: input.genre || undefined,
      fileName: input.file.name,
      contentType: input.file.type || "application/octet-stream",
      fileBase64,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }

  return (await res.json()) as BookItem;
}

export async function getBookDownload(
  bookId: string
): Promise<{ item: BookItem; url: string }> {
  const res = await fetch(`${apiBase()}/books/${encodeURIComponent(bookId)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Get failed: ${res.status} ${text}`);
  }
  return (await res.json()) as { item: BookItem; url: string };
}

export async function deleteBook(
  bookId: string,
  role: "user" | "admin"
): Promise<void> {
  const res = await fetch(`${apiBase()}/books/${encodeURIComponent(bookId)}`, {
    method: "DELETE",
    headers: {
      "x-role": role,
    },
  });

  if (res.status === 204) return;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete failed: ${res.status} ${text}`);
  }
}
