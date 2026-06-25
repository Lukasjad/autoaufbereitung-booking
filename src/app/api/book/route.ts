import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/cal";
import { generateLinkId } from "@/lib/id";
import { sanitize, validEmail, validPhone } from "@/lib/validate";
import { addCors, corsResponse, getOrigin } from "@/lib/cors";
import { rateLimitIP } from "@/lib/rate-limit";
import { sendBookingConfirmation } from "@/lib/email";

function getFirstImage(bilderStr: string): string {
  return bilderStr.split(",").map((u) => u.trim()).filter(Boolean)[0] || "";
}

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function POST(request: NextRequest) {
  const origin = getOrigin(request);

  if (!rateLimitIP(request, 5, 60_000)) {
    return addCors(
      NextResponse.json({ error: "Zu viele Anfragen. Bitte warte 60s." }, { status: 429 }),
      origin
    );
  }

  try {
    const body = await request.json();
    const { start, attendee, metadata } = body;

    if (!start || !attendee?.name || !attendee?.email) {
      return addCors(
        NextResponse.json(
          { error: "Missing required fields: start, attendee.name, attendee.email" },
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
      bookingFieldsResponses: {
        fahrzeugmarke,
        fahrzeugmodell,
        kennzeichen,
        schadensbilder: getFirstImage(bilder),
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

    if (bookingUid) {
      try {
        await sendBookingConfirmation({
          to: email,
          name,
          service,
          start,
          terminLink,
          shortLink,
        });
      } catch {
        console.log("Email not sent (Resend not configured). Booking link:", terminLink);
      }
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
