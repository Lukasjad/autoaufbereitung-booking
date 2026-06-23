import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/cal";
import { generateLinkId } from "@/lib/id";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { start, attendee, metadata } = body;

    if (!start || !attendee?.name || !attendee?.email) {
      return NextResponse.json(
        { error: "Missing required fields: start, attendee.name, attendee.email" },
        { status: 400 }
      );
    }

    const email = attendee.email.trim();
    const name = attendee.name.trim();

    let phoneNumber = attendee.telefon || attendee.phoneNumber || "";
    phoneNumber = phoneNumber.trim().replace(/[^+\d]/g, "");
    if (phoneNumber && !phoneNumber.startsWith("+")) {
      phoneNumber = phoneNumber.startsWith("0")
        ? `+49${phoneNumber.slice(1)}`
        : `+${phoneNumber}`;
    }

    const buchungLinkId = generateLinkId();
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
        email,
        name,
        fahrzeugmarke: metadata?.fahrzeugmarke || "",
        fahrzeugmodell: metadata?.fahrzeugmodell || "",
        kennzeichen: metadata?.kennzeichen || "",
        schadensbilder: shortLink,
      },
      metadata: {
        baujahr: metadata?.baujahr || "",
        bilder: metadata?.bilder || "",
        notizen: metadata?.notizen || "",
        buchung_link_id: buchungLinkId,
      },
    });

    const bookingUid = result?.data?.uid;
    const terminLink = bookingUid ? `${proto}://${host}/termin/${bookingUid}` : "";

    return NextResponse.json({ ...result, terminLink, shortLink });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
