import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";
import { createAdminSession } from "@/lib/admin-auth";
import { corsResponse } from "@/lib/cors";

export async function OPTIONS() {
  return corsResponse("*");
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") || "";

  try {
    const body = await request.json();
    const password = body?.password;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Passwort erforderlich" }, { status: 400 });
    }

    const hashRaw = env("ADMIN_PASSWORD_HASH");
    if (!hashRaw) {
      return NextResponse.json({ error: "Admin nicht konfiguriert" }, { status: 500 });
    }

    const hash = Buffer.from(hashRaw, "base64").toString("utf-8");
    const ok = await bcrypt.compare(password, hash);

    if (!ok) {
      return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
    }

    const token = createAdminSession();

    const res = NextResponse.json({ token });
    if (origin) res.headers.set("Access-Control-Allow-Origin", origin);
    return res;
  } catch {
    return NextResponse.json({ error: "Fehler beim Login" }, { status: 500 });
  }
}
