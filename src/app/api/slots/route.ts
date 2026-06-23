import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/cal";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const timeZone = request.nextUrl.searchParams.get("timeZone") || "Europe/Berlin";

  if (!date) {
    return NextResponse.json({ error: "date parameter required" }, { status: 400 });
  }

  try {
    const data = await getAvailableSlots(date, timeZone);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
