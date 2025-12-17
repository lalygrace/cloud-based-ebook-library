import { readFile } from "node:fs/promises";
import path from "node:path";

function parseEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

async function resolveApiBaseUrl(): Promise<string> {
  // Prefer the persisted LocalStack output for dynamic API IDs.
  // In dev, Next's process.cwd() is typically the frontend folder.
  const persisted = path.resolve(
    process.cwd(),
    "..",
    "infra",
    "localstack",
    "state",
    "ebook-library.env"
  );

  try {
    const raw = await readFile(persisted, "utf8");
    const env = parseEnv(raw);
    const base = env["API_BASE_URL"];
    if (base) return base.replace(/\/$/, "");
  } catch {
    // ignore; fall back to env
  }

  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    throw new Error(
      "Missing LocalStack API base URL. Start LocalStack and run ./scripts/localstack-api-env.sh"
    );
  }
  return base.replace(/\/$/, "");
}

async function handler(req: Request, params: Promise<{ path?: string[] }>) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const apiBase = await resolveApiBaseUrl();
  const { path: pathParts = [] } = await params;

  const url = new URL(req.url);
  const target = `${apiBase}/${pathParts.map(encodeURIComponent).join("/")}${
    url.search
  }`;

  const headers = new Headers(req.headers);
  headers.delete("host");

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body:
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : await req.arrayBuffer(),
    redirect: "manual",
  });

  const resHeaders = new Headers(upstream.headers);
  // Ensure same-origin callers can read it; browser-side CORS isn't needed anymore,
  // but keep this for safety when debugging.
  resHeaders.set("Access-Control-Allow-Origin", "*");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export function GET(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return handler(req, ctx.params);
}
export function POST(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return handler(req, ctx.params);
}
export function DELETE(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return handler(req, ctx.params);
}
export function OPTIONS(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return handler(req, ctx.params);
}
