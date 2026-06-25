import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAllBookings } from "@/lib/cal";
import { addCorsStrict, corsResponse } from "@/lib/cors";
import { rateLimitIP } from "@/lib/rate-limit";
import { env } from "@/lib/env";

export async function OPTIONS(request: NextRequest) {
  return corsResponse(request.headers.get("origin") || "");
}

export async function GET(request: NextRequest) {
  if (!(await rateLimitIP(request, 30, 60_000, "bookings-list"))) {
    return addCorsStrict(
      NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 }),
      request
    );
  }

  const auth = request.headers.get("authorization");
  const hashRaw = env("ADMIN_PASSWORD_HASH");
  const hash = hashRaw ? Buffer.from(hashRaw, "base64").toString("utf-8") : "";

  if (!auth || !hash) {
    return addCorsStrict(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      request
    );
  }

  const token = auth.replace(/^Bearer\s+/i, "");
  const valid = await bcrypt.compare(token, hash);
  if (!valid) {
    return addCorsStrict(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      request
    );
  }

  try {
    const data = await getAllBookings();
    const safe = { ...data };
    if (Array.isArray(safe?.data)) {
      safe.data = safe.data.map((b: any) => {
        if (!b.metadata) return b;
        const { access_token, accessToken, ...rest } = b.metadata;
        return { ...b, metadata: rest };
      });
    }
    return addCorsStrict(NextResponse.json(safe), request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return addCorsStrict(
      NextResponse.json({ error: message }, { status: 500 }),
      request
    );
  }
}
