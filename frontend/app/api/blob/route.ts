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

export async function GET(request: Request): Promise<Response> {
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
    (searchParams.get("disposition") || "inline").toLowerCase() === "attachment"
      ? "attachment"
      : "inline";

  const upstreamRes = await fetch(upstreamUrl.toString(), {
    redirect: "follow",
    cache: "no-store",
  });

  if (!upstreamRes.ok || !upstreamRes.body) {
    const text = await upstreamRes.text().catch(() => "");
    return badRequest(text || `Upstream failed (${upstreamRes.status})`, 502);
  }

  const headers = new Headers();

  // Prefer explicit contentType (from our API) to avoid download-triggering octet-stream.
  headers.set(
    "Content-Type",
    contentType ||
      upstreamRes.headers.get("content-type") ||
      "application/octet-stream"
  );

  // Force inline for the reader; prevents browsers from treating it as a download.
  headers.set(
    "Content-Disposition",
    `${disposition}; filename=\"${fileName}\"`
  );

  // Avoid caching presigned URLs.
  headers.set("Cache-Control", "no-store");

  return new Response(upstreamRes.body, {
    status: 200,
    headers,
  });
}
