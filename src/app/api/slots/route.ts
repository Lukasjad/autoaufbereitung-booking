import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots, getBookingsForDate } from "@/lib/cal";
import { addCors, corsResponse, getOrigin } from "@/lib/cors";
import { rateLimitIP } from "@/lib/rate-limit";

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);

  if (!(await rateLimitIP(request, 30, 60_000, "slots"))) {
    return addCors(
      NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 }),
      origin
    );
  }

  const date = request.nextUrl.searchParams.get("date");
  const timeZone = request.nextUrl.searchParams.get("timeZone") || "Europe/Berlin";

  try {
    if (!date) {
      return addCors(
        NextResponse.json({ error: "date parameter required" }, { status: 400 }),
        origin
      );
    }
    const [slotsData, bookingsData] = await Promise.all([
      getAvailableSlots(date, timeZone),
      getBookingsForDate(date).catch(() => ({ data: [] })),
    ]);

    const raw = slotsData?.data?.[date] ?? slotsData?.slots?.[date] ?? [];
    const rawList: { start: string; time?: string }[] = Array.isArray(raw) ? raw : [];

    const bookedStarts = new Set<string>();
    for (const b of bookingsData?.data ?? []) {
      if (b.start) bookedStarts.add(b.start);
    }

    const free: { start: string; time?: string }[] = [];
    const booked: { start: string; time?: string }[] = [];
    for (const s of rawList) {
      if (bookedStarts.has(s.start)) {
        booked.push(s);
      } else {
        free.push(s);
      }
    }

    const resp: Record<string, any> = {};
    resp[date] = free;
    if (booked.length > 0) {
      resp[`${date}_booked`] = booked;
    }

    return addCors(
      NextResponse.json(slotsData.slots ? { slots: resp } : { data: resp }),
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
