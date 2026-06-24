import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAllBookings } from "@/lib/cal";
import { addCors, corsResponse, getOrigin } from "@/lib/cors";
import { rateLimitIP } from "@/lib/rate-limit";
import { env } from "@/lib/env";

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);

  if (!rateLimitIP(request, 30, 60_000)) {
    return addCors(
      NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 }),
      origin
    );
  }

  const auth = request.headers.get("authorization");
  const hashRaw = env("ADMIN_PASSWORD_HASH");
  const hash = hashRaw ? Buffer.from(hashRaw, "base64").toString("utf-8") : "";

  if (!auth || !hash) {
    return addCors(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      origin
    );
  }

  const token = auth.replace(/^Bearer\s+/i, "");
  const valid = await bcrypt.compare(token, hash);
  if (!valid) {
    return addCors(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      origin
    );
  }

  try {
    const data = await getAllBookings();
    const safe = { ...data };
    if (Array.isArray(safe?.data)) {
      safe.data = safe.data.map((b: any) => {
        if (!b.metadata) return b;
        const { access_token, ...rest } = b.metadata;
        return { ...b, metadata: rest };
      });
    }
    return addCors(NextResponse.json(safe), origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return addCors(
      NextResponse.json({ error: message }, { status: 500 }),
      origin
    );
  }
}
