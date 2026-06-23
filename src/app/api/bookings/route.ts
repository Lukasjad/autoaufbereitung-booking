import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAllBookings } from "@/lib/cal";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const hashRaw = process.env.ADMIN_PASSWORD_HASH;
  const hash = hashRaw ? Buffer.from(hashRaw, "base64").toString("utf-8") : "";

  if (!auth || !hash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = auth.replace(/^Bearer\s+/i, "");
  const valid = await bcrypt.compare(token, hash);
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getAllBookings();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
