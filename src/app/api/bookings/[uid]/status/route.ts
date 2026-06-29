import { NextRequest, NextResponse } from "next/server";
import { getBookingByUid, confirmBooking, declineBooking } from "@/lib/cal";
import { sanitize, validOrigin } from "@/lib/validate";
import { addCorsStrict, corsResponse } from "@/lib/cors";
import { rateLimitIP } from "@/lib/rate-limit";
import { sendBookingApproved, sendBookingRejected } from "@/lib/email";
import { verifyAdmin } from "@/lib/admin-auth";

export async function OPTIONS(request: NextRequest) {
  return corsResponse(request.headers.get("origin") || "");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  if (!(await rateLimitIP(request, 10, 60_000, "booking-status"))) {
    return addCorsStrict(
      NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 }),
      request
    );
  }

  if (!validOrigin(request.headers.get("origin"))) {
    return addCorsStrict(NextResponse.json({ error: "Ungültiger Origin" }, { status: 403 }), request);
  }

  if (!(await verifyAdmin(request))) {
    return addCorsStrict(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      request
    );
  }

  try {
    const body = await request.json();
    const newStatus = body?.status;
    if (!newStatus || !["ACCEPTED", "REJECTED"].includes(newStatus)) {
      return addCorsStrict(
        NextResponse.json({ error: "Status muss ACCEPTED oder REJECTED sein" }, { status: 400 }),
        request
      );
    }

    const { uid } = await params;
    if (!uid || typeof uid !== "string") {
      return addCorsStrict(
        NextResponse.json({ error: "Ungültige Buchungs-ID" }, { status: 400 }),
        request
      );
    }

    const booking = await getBookingByUid(uid);
    const data = booking?.data;
    if (!data) {
      return addCorsStrict(
        NextResponse.json({ error: "Buchung nicht gefunden" }, { status: 404 }),
        request
      );
    }

    if (newStatus === "ACCEPTED") {
      await confirmBooking(uid);
    } else {
      await declineBooking(uid);
    }

    const attendee = data.attendees?.[0];
    const meta = data.metadata || {};
    const email = attendee?.email || "";
    const name = sanitize(attendee?.name || "Kunde");
    const service = sanitize(meta.service || "");
    const start = data.start || "";
    const accessToken = meta.access_token || meta.accessToken || "";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host") || "autoaufbereitung.de";
    const terminLink = `${proto}://${host}/termin/${uid}?token=${encodeURIComponent(accessToken)}`;

    if (email) {
      if (newStatus === "ACCEPTED") {
        sendBookingApproved({ to: email, name, service, start, terminLink }).catch((err) =>
          console.error("sendBookingApproved error:", err)
        );
      } else {
        sendBookingRejected({ to: email, name, service, start }).catch((err) =>
          console.error("sendBookingRejected error:", err)
        );
      }
    }

    return addCorsStrict(
      NextResponse.json({ success: true, status: newStatus }),
      request
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return addCorsStrict(
      NextResponse.json({ error: message }, { status: 500 }),
      request
    );
  }
}
