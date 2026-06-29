import { NextRequest, NextResponse } from "next/server";
import { getBookingByUid } from "@/lib/cal";
import { addCorsStrict, corsResponse } from "@/lib/cors";
import { rateLimitIP } from "@/lib/rate-limit";
import { verifyAdmin } from "@/lib/admin-auth";

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

  try {
    const isAdmin = await verifyAdmin(request);
    const isAccess = !isAdmin && await verifyAccess(uid, token);

    if (!isAdmin && !isAccess) {
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
    console.error("Booking fetch error:", error);
    return addCorsStrict(
      NextResponse.json({ error: "Fehler beim Laden der Buchung" }, { status: 500 }),
      request
    );
  }
}
