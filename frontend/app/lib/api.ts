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

export type UserRole = "user" | "admin";

export type User = {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
};

type AuthResponse = {
  token: string;
  user: User;
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
  // Same-origin proxy to avoid CORS + stale LocalStack API IDs.
  return "/api/proxy";
}

async function apiFetch(
  path: string,
  init?: RequestInit & { token?: string | null }
): Promise<Response> {
  const token = init?.token ?? null;
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${apiBase()}${path}`, { ...init, headers, cache: "no-store" });
}

export async function signup(input: {
  email: string;
  name: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await apiFetch("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Signup failed: ${res.status} ${text}`);
  }

  return (await res.json()) as AuthResponse;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed: ${res.status} ${text}`);
  }

  return (await res.json()) as AuthResponse;
}

export async function me(token: string): Promise<{ user: User }> {
  const res = await apiFetch("/auth/me", { token });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Me failed: ${res.status} ${text}`);
  }
  return (await res.json()) as { user: User };
}

export async function listBooks(
  token: string,
  opts?: { q?: string; genre?: string; limit?: number; lastKey?: unknown }
): Promise<{ items: BookItem[]; lastKey: unknown | null }> {
  const params = new URLSearchParams();
  if (opts?.q) params.set("q", opts.q);
  if (opts?.genre) params.set("genre", opts.genre);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.lastKey) params.set("lastKey", JSON.stringify(opts.lastKey));

  const path = params.toString() ? `/books?${params.toString()}` : "/books";
  const res = await apiFetch(path, { token });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`List failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    items: BookItem[];
    lastKey?: unknown | null;
  };
  return { items: data.items, lastKey: data.lastKey ?? null };
}

export async function uploadBook(input: {
  title: string;
  author: string;
  genre?: string;
  file: File;
  token: string;
}): Promise<BookItem> {
  const buffer = await input.file.arrayBuffer();
  const fileBase64 = arrayBufferToBase64(buffer);

  const res = await apiFetch("/books", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    token: input.token,
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
  bookId: string,
  token: string
): Promise<{ item: BookItem; url: string }> {
  return getBook(bookId, token, { disposition: "attachment" });
}

export async function getBook(
  bookId: string,
  token: string,
  opts?: { disposition?: "inline" | "attachment" }
): Promise<{ item: BookItem; url: string }> {
  const params = new URLSearchParams();
  if (opts?.disposition) params.set("disposition", opts.disposition);
  const qs = params.toString();
  const path = qs
    ? `/books/${encodeURIComponent(bookId)}?${qs}`
    : `/books/${encodeURIComponent(bookId)}`;

  const res = await apiFetch(path, { token });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Get failed: ${res.status} ${text}`);
  }
  return (await res.json()) as { item: BookItem; url: string };
}

export async function deleteBook(bookId: string, token: string): Promise<void> {
  const res = await apiFetch(`/books/${encodeURIComponent(bookId)}`, {
    method: "DELETE",
    token,
  });

  if (res.status === 204) return;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete failed: ${res.status} ${text}`);
  }
}
