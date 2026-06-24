import { env } from "@/lib/env";

const CAL_API = "https://api.cal.com/v2";

function getHeaders(version: string) {
  return {
    Authorization: `Bearer ${env("CAL_API_KEY")}`,
    "cal-api-version": version,
    "Content-Type": "application/json",
  };
}

export async function getAvailableSlots(date: string, timeZone: string) {
  const url = `${CAL_API}/slots?eventTypeId=${env("CAL_EVENT_TYPE_ID")}&start=${date}&end=${date}&timeZone=${encodeURIComponent(timeZone)}`;
  const res = await fetch(url, { headers: getHeaders("2024-09-04") });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cal.com slots error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function createBooking(data: {
  start: string;
  attendee: { name: string; email: string; timeZone: string; language?: string; phoneNumber?: string };
  location?: string;
  metadata?: Record<string, string>;
  bookingFieldsResponses?: Record<string, string>;
}) {
  const res = await fetch(`${CAL_API}/bookings`, {
    method: "POST",
    headers: getHeaders("2026-02-25"),
    body: JSON.stringify({
      eventTypeId: Number(env("CAL_EVENT_TYPE_ID")),
      start: data.start,
      attendee: data.attendee,
      ...(data.location ? { location: data.location } : {}),
      metadata: data.metadata,
      bookingFieldsResponses: data.bookingFieldsResponses,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cal.com booking error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getBookingByUid(uid: string) {
  const res = await fetch(`${CAL_API}/bookings/${uid}`, {
    headers: getHeaders("2026-02-25"),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cal.com booking error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getAllBookings() {
  const res = await fetch(
    `${CAL_API}/bookings?eventTypeId=${env("CAL_EVENT_TYPE_ID")}&status=upcoming,past`,
    { headers: getHeaders("2026-02-25") }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cal.com bookings error ${res.status}: ${text}`);
  }
  return res.json();
}
