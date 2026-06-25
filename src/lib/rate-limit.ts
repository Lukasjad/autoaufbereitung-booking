import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let supabase: ReturnType<typeof createClient> | null = null;

function getDb() {
  if (!supabase) {
    const url = env("SUPABASE_URL");
    const key = env("SUPABASE_SERVICE_KEY");
    if (!url || !key) return null;
    supabase = createClient(url, key);
  }
  return supabase;
}

function ipFromRequest(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function windowStart(windowMs: number): string {
  return new Date(Date.now() - windowMs).toISOString();
}

export async function rateLimitIP(
  request: Request,
  max = 10,
  windowMs = 60_000,
): Promise<boolean> {
  const ip = ipFromRequest(request);
  const db = getDb();

  if (!db) {
    // Fallback: per-process limit (besser als nichts)
    return fallbackRateLimit(ip, max, windowMs);
  }

  try {
    const ws = windowStart(windowMs);

    // Alte Einträge dieser IP bereinigen (nutzt Index auf key, created_at)
    await db.from("rate_limits").delete().eq("key", ip).lt("created_at", ws);

    // Anzahl der verbleibenden Requests zählen
    const { count } = await db
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("key", ip);

    if (count != null && count >= max) return false;

    await db.from("rate_limits").insert({ key: ip } as any);

    return true;
  } catch {
    return fallbackRateLimit(ip, max, windowMs);
  }
}

// In-Memory Fallback (pro Instanz, falls Supabase ausfällt)
const fallbackHits = new Map<string, { count: number; reset: number }>();

function fallbackRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = fallbackHits.get(key);
  if (!entry || now > entry.reset) {
    fallbackHits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
