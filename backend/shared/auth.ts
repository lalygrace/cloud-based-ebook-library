import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { JWT_SECRET } from "./config.js";
import type { UserRole } from "./types.js";

export type AuthClaims = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
};

export async function hashPassword(password: string): Promise<string> {
  // bcryptjs is pure JS and works well in Lambda.
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function signToken(claims: Omit<AuthClaims, "iat" | "exp">): string {
  // 12h is a reasonable demo default.
  return jwt.sign(claims, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyToken(token: string): AuthClaims {
  return jwt.verify(token, JWT_SECRET) as AuthClaims;
}

export function getBearerToken(
  headers: Record<string, string | undefined> | null | undefined
): string | null {
  if (!headers) return null;

  const raw = headers["authorization"] ?? headers["Authorization"];
  if (!raw) return null;

  const m = raw.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return m[1] ?? null;
}

export function requireAuth(
  headers: Record<string, string | undefined> | null | undefined
): AuthClaims {
  const token = getBearerToken(headers);
  if (!token) {
    const err = new Error("Missing Authorization Bearer token");
    (err as any).statusCode = 401;
    throw err;
  }

  try {
    return verifyToken(token);
  } catch {
    const err = new Error("Invalid or expired token");
    (err as any).statusCode = 401;
    throw err;
  }
}
