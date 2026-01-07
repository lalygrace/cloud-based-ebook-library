import { readFileSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

type RouteContext = { params: { path?: string[] } };

function readApiBaseUrl(): string {
  // LocalStack provisioning writes this file with the current REST API ID.
  // We read it at request-time so container restarts (API_ID changes) don’t break the frontend.
  const envPath = path.resolve(
    process.cwd(),
    "..",
    "infra",
    "localstack",
    "state",
    "ebook-library.env"
  );

  const raw = readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key === "API_BASE_URL") return value;
  }

  throw new Error(`API_BASE_URL not found in ${envPath}`);
}

function joinUrl(base: string, pathname: string, search: string): string {
  const baseWithSlash = base.endsWith("/") ? base : `${base}/`;
  const url = new URL(pathname.replace(/^\//, ""), baseWithSlash);
  url.search = search;
  return url.toString();
}

function downstreamPathFromRequest(requestUrl: string): string {
  const { pathname } = new URL(requestUrl);
  const prefix = "/api/proxy";

  if (pathname === prefix) return "/";
  if (pathname.startsWith(prefix + "/")) return pathname.slice(prefix.length);

  return "/";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function proxy(request: Request, ctx: RouteContext): Promise<Response> {
  let apiBaseUrl: string;
  try {
    apiBaseUrl = readApiBaseUrl();
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to resolve API_BASE_URL";
    return new Response(message, { status: 500 });
  }

  const pathname = downstreamPathFromRequest(request.url);
  const url = joinUrl(apiBaseUrl, pathname, new URL(request.url).search);

  const headers = new Headers(request.headers);
  // Avoid forwarding hop-by-hop headers.
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  const upstream = await fetch(url, {
    method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });

  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete("transfer-encoding");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export async function GET(request: Request, ctx: RouteContext) {
  return proxy(request, ctx);
}
export async function POST(request: Request, ctx: RouteContext) {
  return proxy(request, ctx);
}
export async function PUT(request: Request, ctx: RouteContext) {
  return proxy(request, ctx);
}
export async function PATCH(request: Request, ctx: RouteContext) {
  return proxy(request, ctx);
}
export async function DELETE(request: Request, ctx: RouteContext) {
  return proxy(request, ctx);
}
export async function OPTIONS(request: Request, ctx: RouteContext) {
  return proxy(request, ctx);
}
