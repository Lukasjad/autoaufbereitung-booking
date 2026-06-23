import { NextRequest, NextResponse } from "next/server";
import { getBookingByUid } from "@/lib/cal";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;
  try {
    const data = await getBookingByUid(uid);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
