import { NextRequest, NextResponse } from "next/server";
import { createBooking, getAllBookings, updateBookingLocation } from "@/lib/cal";
import { generateLinkId } from "@/lib/id";
import { sanitize, validEmail, validPhone, validKennzeichen, validOrigin } from "@/lib/validate";
import { addCors, corsResponse, getOrigin } from "@/lib/cors";
import { rateLimitIP } from "@/lib/rate-limit";

function getFirstImage(bilderStr: string): string {
  return bilderStr.split(",").map((u) => u.trim()).filter(Boolean)[0] || "";
}

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function POST(request: NextRequest) {
  const origin = getOrigin(request);

  if (!(await rateLimitIP(request, 5, 60_000, "book"))) {
    return addCors(
      NextResponse.json({ error: "Zu viele Anfragen. Bitte warte 60s." }, { status: 429 }),
      origin
    );
  }

  if (!validOrigin(request.headers.get("origin"))) {
    return addCors(NextResponse.json({ error: "Ungültiger Origin" }, { status: 403 }), origin);
  }

  try {
    const body = await request.json();
    const { start, attendee, metadata } = body;

    if (!start || typeof start !== "string" || start.length > 50) {
      return addCors(
        NextResponse.json(
          { error: "Ungültiger Termin" },
          { status: 400 }
        ),
        origin
      );
    }
    if (isNaN(Date.parse(start))) {
      return addCors(
        NextResponse.json(
          { error: "Ungültiges Datumsformat" },
          { status: 400 }
        ),
        origin
      );
    }

    if (!attendee?.name || !attendee?.email) {
      return addCors(
        NextResponse.json(
          { error: "Missing required fields: attendee.name, attendee.email" },
          { status: 400 }
        ),
        origin
      );
    }

    const name = sanitize(attendee.name);
    const email = sanitize(attendee.email);

    if (!validEmail(email)) {
      return addCors(
        NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 }),
        origin
      );
    }

    let phoneNumber = attendee.telefon || attendee.phoneNumber || "";
    phoneNumber = sanitize(phoneNumber).replace(/[^+\d]/g, "");
    if (phoneNumber && !phoneNumber.startsWith("+")) {
      phoneNumber = phoneNumber.startsWith("0")
        ? `+49${phoneNumber.slice(1)}`
        : `+${phoneNumber}`;
    }
    if (phoneNumber && !validPhone(phoneNumber)) {
      return addCors(
        NextResponse.json({ error: "Ungültige Telefonnummer" }, { status: 400 }),
        origin
      );
    }

    const fahrzeugmarke = sanitize(metadata?.fahrzeugmarke || "");
    const fahrzeugmodell = sanitize(metadata?.fahrzeugmodell || "");
    const kennzeichen = sanitize(metadata?.kennzeichen || "");
    const baujahr = sanitize(metadata?.baujahr || "");
    const service = sanitize(metadata?.service || "");
    const treibstoff = sanitize(metadata?.treibstoff || "");
    const kilometerstand = sanitize(metadata?.kilometerstand || "");
    const schadensbeschreibung = sanitize(metadata?.schadensbeschreibung || "");
    const notizen = sanitize(metadata?.notizen || "");
    const bilder = (metadata?.bilder || "")
      .split(",")
      .map((u: string) => sanitize(u))
      .filter(Boolean)
      .join(",");

    if (fahrzeugmarke.length > 50 || fahrzeugmodell.length > 50 || kennzeichen.length > 20) {
      return addCors(
        NextResponse.json({ error: "Eingabefelder zu lang" }, { status: 400 }),
        origin
      );
    }

    if (kennzeichen && !validKennzeichen(kennzeichen)) {
      return addCors(
        NextResponse.json({ error: "Ungültiges Kennzeichen-Format (z.B. AB-CD 123)" }, { status: 400 }),
        origin
      );
    }

    // Prüfen, ob der Termin bereits belegt ist (pending + accepted)
    try {
      const existing = await getAllBookings();
      const booked = existing?.data?.some(
        (b: any) => b.start === start && b.status !== "cancelled" && b.status !== "rejected"
      );
      if (booked) {
        return addCors(
          NextResponse.json({ error: "Dieser Termin ist bereits gebucht" }, { status: 409 }),
          origin
        );
      }
    } catch {
      // Fallback: kein Fehler, wenn Prüfung fehlschlägt
    }

    const buchungLinkId = generateLinkId();
    const accessToken = crypto.randomUUID();
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3000";
    const shortLink = `${proto}://${host}/s/${buchungLinkId}`;

    const result = await createBooking({
      start,
      attendee: {
        name,
        email,
        timeZone: attendee.timeZone || "Europe/Berlin",
        language: "de",
        ...(phoneNumber ? { phoneNumber } : {}),
      },
      location: shortLink,
      idempotencyKey: `booking-${start}-${email}-${buchungLinkId}`,
      bookingFieldsResponses: {
        fahrzeugmarke,
        fahrzeugmodell,
        kennzeichen,
        schadensbilder: getFirstImage(bilder),
        service,
        schadensbeschreibung,
        notizen,
      },
      metadata: {
        service,
        fahrzeugmarke,
        fahrzeugmodell,
        kennzeichen,
        baujahr,
        treibstoff,
        kilometerstand,
        schadensbeschreibung,
        bilder,
        notizen,
        buchung_link_id: buchungLinkId,
        access_token: accessToken,
      },
    });

    const bookingUid = result?.data?.uid;
    const terminLink = bookingUid ? `${proto}://${host}/termin/${bookingUid}?token=${accessToken}` : "";
    const entryLink = bookingUid ? `${proto}://${host}/portal/${bookingUid}` : "";
    const selectionLink = bookingUid ? `${entryLink}?token=${encodeURIComponent(accessToken)}` : "";

    // Location in Cal.com auf die Auswahl-Seite (/portal/{uid}?token=...) setzen.
    // Der Kunde sieht dort zwei Optionen: Kundenlogin + Admin Login.
    if (bookingUid) {
      updateBookingLocation(bookingUid, selectionLink).catch((err) =>
        console.error("Cal.com location update error:", err)
      );
    }

    return addCors(
      NextResponse.json({ ...result, terminLink, shortLink, accessToken }),
      origin
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return addCors(
      NextResponse.json({ error: message }, { status: 500 }),
      origin
    );
  }
}
