import "server-only";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const SESSION_COOKIE = "lb_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

function getSecret(): string {
  return (
    process.env.SECRET_KEY ||
    "linkbreeze-dev-secret-key-change-me-in-production-please"
  );
}

export interface SessionPayload {
  userId: number;
  username: string;
  exp: number;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("hex");
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) padded += "=";
  return Buffer.from(padded, "base64").toString("utf8");
}

function createToken(payload: SessionPayload): string {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

function verifyToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;

  const expected = sign(encoded);
  // Constant-time compare to mitigate timing attacks
  if (
    expected.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as SessionPayload;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Read and verify the session cookie. Returns the session payload or null.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Set a signed, httpOnly session cookie.
 */
export async function createSession(userId: number, username: string): Promise<void> {
  const store = await cookies();
  const payload: SessionPayload = {
    userId,
    username,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };
  const token = createToken(payload);
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Clear the session cookie.
 */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Hash a password with bcrypt (12 rounds).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
