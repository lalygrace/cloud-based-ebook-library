export const runtime = "nodejs";

function badRequest(message: string, status = 400): Response {
  return new Response(message, { status });
}

function isAllowedUpstream(url: URL): boolean {
  // In this app, we only proxy LocalStack S3 presigned URLs.
  // Keep this tight so this endpoint can't be abused as a generic open proxy.
  const allowedHosts = new Set(["localhost", "127.0.0.1"]);
  const allowedPorts = new Set(["4566"]);
  return allowedHosts.has(url.hostname) && allowedPorts.has(url.port);
}

function buildResponseHeaders(params: {
  contentType?: string;
  fileName: string;
  disposition: "inline" | "attachment";
  upstreamHeaders: Headers;
}): Headers {
  const headers = new Headers();

  // Prefer explicit contentType (from our API) to avoid download-triggering octet-stream.
  headers.set(
    "Content-Type",
    params.contentType ||
      params.upstreamHeaders.get("content-type") ||
      "application/octet-stream"
  );

  // Force inline for the reader; prevents browsers from treating it as a download.
  headers.set(
    "Content-Disposition",
    `${params.disposition}; filename=\"${params.fileName}\"`
  );

  // Avoid caching presigned URLs.
  headers.set("Cache-Control", "no-store");

  // Forward headers that PDF.js relies on for range requests.
  const passthrough = [
    "accept-ranges",
    "content-length",
    "content-range",
    "etag",
    "last-modified",
  ];
  for (const key of passthrough) {
    const v = params.upstreamHeaders.get(key);
    if (v) headers.set(key, v);
  }

  return headers;
}

function parseParams(request: Request):
  | {
      upstreamUrl: URL;
      contentType?: string;
      fileName: string;
      disposition: "inline" | "attachment";
    }
  | Response {
  const { searchParams } = new URL(request.url);
  const upstream = searchParams.get("url");
  if (!upstream) return badRequest("Missing url");

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(upstream);
  } catch {
    return badRequest("Invalid url");
  }

  if (!isAllowedUpstream(upstreamUrl)) {
    return badRequest("Upstream not allowed", 403);
  }

  const contentType = searchParams.get("contentType") || undefined;
  const fileName = (searchParams.get("fileName") || "file").replace(
    /[\r\n"]/g,
    ""
  );
  const disposition =
    (searchParams.get("disposition") || "inline").toLowerCase() ===
    "attachment"
      ? "attachment"
      : "inline";

  return { upstreamUrl, contentType, fileName, disposition };
}

export async function HEAD(request: Request): Promise<Response> {
  const parsed = parseParams(request);
  if (parsed instanceof Response) return parsed;

  const range = request.headers.get("range") || undefined;

  const upstreamRes = await fetch(parsed.upstreamUrl.toString(), {
    method: "HEAD",
    redirect: "follow",
    cache: "no-store",
    headers: range ? { range } : undefined,
  });

  if (!upstreamRes.ok) {
    const text = await upstreamRes.text().catch(() => "");
    return badRequest(text || `Upstream failed (${upstreamRes.status})`, 502);
  }

  return new Response(null, {
    status: upstreamRes.status,
    headers: buildResponseHeaders({
      contentType: parsed.contentType,
      fileName: parsed.fileName,
      disposition: parsed.disposition,
      upstreamHeaders: upstreamRes.headers,
    }),
  });
}

export async function GET(request: Request): Promise<Response> {
  const parsed = parseParams(request);
  if (parsed instanceof Response) return parsed;

  const range = request.headers.get("range") || undefined;

  const upstreamRes = await fetch(parsed.upstreamUrl.toString(), {
    redirect: "follow",
    cache: "no-store",
    headers: range ? { range } : undefined,
  });

  if (!upstreamRes.ok || !upstreamRes.body) {
    const text = await upstreamRes.text().catch(() => "");
    return badRequest(text || `Upstream failed (${upstreamRes.status})`, 502);
  }

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: buildResponseHeaders({
      contentType: parsed.contentType,
      fileName: parsed.fileName,
      disposition: parsed.disposition,
      upstreamHeaders: upstreamRes.headers,
    }),
  });
}
