import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/cal";
import { addCors, corsResponse, getOrigin } from "@/lib/cors";
import { rateLimitIP } from "@/lib/rate-limit";

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

  const date = request.nextUrl.searchParams.get("date");
  const timeZone = request.nextUrl.searchParams.get("timeZone") || "Europe/Berlin";

  try {
    if (!date) {
      return addCors(
        NextResponse.json({ error: "date parameter required" }, { status: 400 }),
        origin
      );
    }
    const data = await getAvailableSlots(date, timeZone);
    return addCors(NextResponse.json(data), origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return addCors(
      NextResponse.json({ error: message }, { status: 500 }),
      origin
    );
  }
}
