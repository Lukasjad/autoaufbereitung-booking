import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { createHmac, createHash, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

const MAX_ATTEMPTS = 3;
const WINDOW_MS = 5 * 60_000;
const SESSION_TTL = 24 * 60 * 60; // 24h in Sekunden

const attempts = new Map<string, { count: number; lockedUntil: number }>();

function getSecret(): Buffer {
  const key = env("ENV_MASTER_KEY");
  return createHash("sha256").update(key || "fallback-dev-key").digest();
}

function ipFromRequest(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "admin-unknown"
  );
}

function cleanExpired() {
  const now = Date.now();
  for (const [key, val] of attempts) {
    if (now > val.lockedUntil) attempts.delete(key);
  }
}

export function createAdminSession(): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + SESSION_TTL;
  const payload = Buffer.from(JSON.stringify({ sub: "admin", iat, exp })).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  try {
    const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.sub !== "admin") return false;
    if (Math.floor(Date.now() / 1000) > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const ip = ipFromRequest(request);
  const now = Date.now();

  cleanExpired();

  const entry = attempts.get(ip);
  if (entry && now < entry.lockedUntil) {
    return false;
  }

  const auth = request.headers.get("authorization");
  if (!auth) return false;

  const token = auth.replace(/^Bearer\s+/i, "");

  // Session-Token zuerst prüfen (schnell, kein DB-Call)
  if (verifySessionToken(token)) {
    attempts.delete(ip);
    return true;
  }

  // Fallback: Raw-Passwort per bcrypt (für Login-Endpunkt)
  const hashRaw = env("ADMIN_PASSWORD_HASH");
  if (!hashRaw) return false;

  const hash = Buffer.from(hashRaw, "base64").toString("utf-8");
  const ok = await bcrypt.compare(token, hash);

  if (ok) {
    attempts.delete(ip);
    return true;
  }

  if (!entry || now > entry.lockedUntil) {
    attempts.set(ip, { count: 1, lockedUntil: now + WINDOW_MS });
  } else {
    entry.count++;
    if (entry.count >= MAX_ATTEMPTS) {
      entry.lockedUntil = now + WINDOW_MS;
    }
  }

  return false;
}
