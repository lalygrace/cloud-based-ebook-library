import type { APIGatewayProxyResult } from "aws-lambda";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function json(
  statusCode: number,
  body: unknown,
  headers?: Record<string, string>
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  };
}

export function noContent(): APIGatewayProxyResult {
  return {
    statusCode: 204,
    headers: {
      ...corsHeaders,
    },
    body: "",
  };
}

export function error(
  statusCode: number,
  message: string,
  details?: unknown
): APIGatewayProxyResult {
  return json(statusCode, { message, ...(details ? { details } : {}) });
}

export function parseJsonBody<T>(
  rawBody: string | null
): { ok: true; value: T } | { ok: false; message: string } {
  if (!rawBody) return { ok: false, message: "Missing request body" };
  try {
    return { ok: true, value: JSON.parse(rawBody) as T };
  } catch {
    return { ok: false, message: "Invalid JSON body" };
  }
}
