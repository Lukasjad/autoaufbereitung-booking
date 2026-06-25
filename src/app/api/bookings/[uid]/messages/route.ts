import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getBookingByUid } from "@/lib/cal";
import { sanitize } from "@/lib/validate";
import { addCors, corsResponse, getOrigin } from "@/lib/cors";
import { rateLimitIP } from "@/lib/rate-limit";
import { env } from "@/lib/env";

async function verifyCustomer(uid: string, token: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const data = await getBookingByUid(uid);
    return data?.data?.metadata?.access_token === token;
  } catch {
    return false;
  }
}

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get("authorization");
  if (!auth) return false;
  const hashRaw = env("ADMIN_PASSWORD_HASH");
  if (!hashRaw) return false;
  const hash = Buffer.from(hashRaw, "base64").toString("utf-8");
  const pw = auth.replace(/^Bearer\s+/i, "");
  return bcrypt.compare(pw, hash);
}

function isSupabaseConfigured(): boolean {
  return !!(env("SUPABASE_URL") && env("SUPABASE_SERVICE_KEY"));
}

function getSupabaseOrNull() {
  try {
    const { getSupabase } = require("@/lib/supabase");
    return getSupabase();
  } catch {
    return null;
  }
}

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const origin = getOrigin(request);
  const { uid } = await params;

  if (!(await rateLimitIP(request, 30, 60_000))) {
    return addCors(
      NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 }),
      origin
    );
  }

  const isAdmin = await verifyAdmin(request);
  const token = request.nextUrl.searchParams.get("token");
  const isCustomer = !isAdmin && await verifyCustomer(uid, token);

  if (!isAdmin && !isCustomer) {
    return addCors(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      origin
    );
  }

  if (!isSupabaseConfigured()) {
    return addCors(NextResponse.json({ data: [] }), origin);
  }

  const supabase = getSupabaseOrNull();
  if (!supabase) {
    return addCors(NextResponse.json({ data: [] }), origin);
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("booking_uid", uid)
    .order("created_at", { ascending: true });

  if (error) {
    return addCors(
      NextResponse.json({ error: error.message }, { status: 500 }),
      origin
    );
  }

  return addCors(NextResponse.json({ data }), origin);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const origin = getOrigin(request);
  const { uid } = await params;

  if (!(await rateLimitIP(request, 10, 60_000))) {
    return addCors(
      NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 }),
      origin
    );
  }

  const isAdmin = await verifyAdmin(request);
  const token = request.nextUrl.searchParams.get("token");
  const isCustomer = !isAdmin && await verifyCustomer(uid, token);

  if (!isAdmin && !isCustomer) {
    return addCors(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      origin
    );
  }

  if (!isSupabaseConfigured()) {
    return addCors(
      NextResponse.json({ error: "Chat nicht verfügbar (Supabase nicht konfiguriert)" }, { status: 503 }),
      origin
    );
  }

  const supabase = getSupabaseOrNull();
  if (!supabase) {
    return addCors(
      NextResponse.json({ error: "Chat nicht verfügbar" }, { status: 503 }),
      origin
    );
  }

  const body = await request.json();
  const textRaw = body.text || "";
  const imageUrlsRaw = body.imageUrls || [];

  if (!textRaw && imageUrlsRaw.length === 0) {
    return addCors(
      NextResponse.json({ error: "Text oder Bilder erforderlich" }, { status: 400 }),
      origin
    );
  }

  const text = sanitize(textRaw).slice(0, 2000);
  const imageUrls = Array.isArray(imageUrlsRaw)
    ? imageUrlsRaw.map((u: string) => sanitize(u).slice(0, 500)).filter(Boolean)
    : [];

  const sender = isAdmin ? "admin" : "customer";

  const { data, error } = await supabase
    .from("messages")
    .insert({
      booking_uid: uid,
      sender,
      text: text || null,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
    })
    .select()
    .single();

  if (error) {
    return addCors(
      NextResponse.json({ error: error.message }, { status: 500 }),
      origin
    );
  }

  return addCors(NextResponse.json({ data }), origin);
}
