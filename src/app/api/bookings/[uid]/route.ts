import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getBookingByUid } from "@/lib/cal";
import { addCorsStrict, corsResponse } from "@/lib/cors";
import { env } from "@/lib/env";

export async function OPTIONS(request: NextRequest) {
  return corsResponse(request.headers.get("origin") || "");
}

function getToken(meta: Record<string, string> | undefined): string {
  return meta?.access_token || meta?.accessToken || "";
}

async function verifyAccess(uid: string, token: string | null): Promise<boolean> {
  if (!token) return false;
  const data = await getBookingByUid(uid);
  return getToken(data?.data?.metadata) === token;
}

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get("authorization");
  if (!auth) return false;
  const hashRaw = env("ADMIN_PASSWORD_HASH");
  if (!hashRaw) return false;
  const hash = Buffer.from(hashRaw, "base64").toString("utf-8");
  const pw = auth.replace(/^Bearer\s+/i, "");
  return bcrypt.compare(pw, hash);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;
  const token = request.nextUrl.searchParams.get("token");
  const legacy = request.nextUrl.searchParams.get("legacy") === "1";

  try {
    const isAdmin = await verifyAdmin(request);
    const isAccess = !isAdmin && await verifyAccess(uid, token);
    const isLegacy = !isAdmin && !isAccess && legacy;

    if (!isAdmin && !isAccess && !isLegacy) {
      return addCorsStrict(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        request
      );
    }

    const data = await getBookingByUid(uid);
    const safe = { ...data };
    if (!isAdmin && safe?.data?.metadata) {
      const { access_token, accessToken, ...rest } = safe.data.metadata;
      safe.data.metadata = rest;
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
