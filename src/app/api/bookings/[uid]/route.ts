import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getBookingByUid } from "@/lib/cal";
import { addCors, corsResponse, getOrigin } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

async function verifyAccess(uid: string, token: string | null): Promise<boolean> {
  if (!token) return false;
  const data = await getBookingByUid(uid);
  const meta = data?.data?.metadata || {};
  return meta.access_token === token;
}

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get("authorization");
  if (!auth) return false;
  const hashRaw = process.env.ADMIN_PASSWORD_HASH;
  if (!hashRaw) return false;
  const hash = Buffer.from(hashRaw, "base64").toString("utf-8");
  const pw = auth.replace(/^Bearer\s+/i, "");
  return bcrypt.compare(pw, hash);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const origin = getOrigin(request);
  const { uid } = await params;
  const token = request.nextUrl.searchParams.get("token");
  const legacy = request.nextUrl.searchParams.get("legacy") === "1";

  try {
    const isAdmin = await verifyAdmin(request);
    const isAccess = !isAdmin && await verifyAccess(uid, token);
    const isLegacy = !isAdmin && !isAccess && legacy;

    if (!isAdmin && !isAccess && !isLegacy) {
      return addCors(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        origin
      );
    }

    const data = await getBookingByUid(uid);
    const safe = { ...data };
    if (!isAdmin && safe?.data?.metadata) {
      const { access_token, ...rest } = safe.data.metadata;
      safe.data.metadata = rest;
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
