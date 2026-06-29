import { describe, it, expect, vi, beforeEach } from "vitest";

const mockEnv = vi.hoisted(() => vi.fn());
const mockRateLimitIP = vi.hoisted(() => vi.fn());
const mockGetBookingByUid = vi.hoisted(() => vi.fn());
const mockVerifyAdmin = vi.hoisted(() => vi.fn());
const mockValidOrigin = vi.hoisted(() => vi.fn());
const mockGetSupabase = vi.hoisted(() => vi.fn());
const mockSendAdminNewMessageNotification = vi.hoisted(() => vi.fn());
const mockSanitize = vi.hoisted(() => vi.fn((v: string) => v.trim()));

vi.mock("@/lib/env", () => ({ env: mockEnv }));
vi.mock("@/lib/rate-limit", () => ({ rateLimitIP: mockRateLimitIP }));
vi.mock("@/lib/cal", () => ({ getBookingByUid: mockGetBookingByUid }));
vi.mock("@/lib/admin-auth", () => ({ verifyAdmin: mockVerifyAdmin }));
vi.mock("@/lib/validate", () => ({ validOrigin: mockValidOrigin, sanitize: mockSanitize }));
vi.mock("@/lib/supabase", () => ({ getSupabase: mockGetSupabase }));
vi.mock("@/lib/email", () => ({
  sendAdminNewMessageNotification: mockSendAdminNewMessageNotification,
}));
vi.mock("@/lib/cors", () => ({
  addCorsStrict: vi.fn((res) => res),
  corsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { GET, POST } from "@/app/api/bookings/[uid]/messages/route";
import { NextRequest } from "next/server";

function makeGetReq(uid: string, token?: string, auth?: string): NextRequest {
  let url = `http://localhost:3000/api/bookings/${uid}/messages`;
  if (token) url += `?token=${token}`;
  const headers: Record<string, string> = { origin: "http://localhost:3000", host: "localhost:3000" };
  if (auth) headers.authorization = auth;
  return new NextRequest(url, { headers });
}

function makePostReq(uid: string, body: unknown, token?: string, auth?: string): NextRequest {
  let url = `http://localhost:3000/api/bookings/${uid}/messages`;
  if (token) url += `?token=${token}`;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    origin: "http://localhost:3000",
    host: "localhost:3000",
  };
  if (auth) headers.authorization = auth;
  return new NextRequest(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("GET /api/bookings/[uid]/messages", () => {
  const UID = "booking-abc";

  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitIP.mockResolvedValue(true);
    mockVerifyAdmin.mockResolvedValue(false);
    mockValidOrigin.mockReturnValue(true);
    mockGetBookingByUid.mockResolvedValue({
      data: { metadata: { access_token: "customer-token-123" } },
    });
    mockEnv.mockImplementation((name: string) => {
      if (name === "SUPABASE_URL") return "https://supabase.co";
      if (name === "SUPABASE_SERVICE_KEY") return "key";
      return "";
    });
  });

  it("returns messages for admin", async () => {
    mockVerifyAdmin.mockResolvedValue(true);
    const sb = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 1, text: "Hallo", sender: "customer" }], error: null }),
    };
    mockGetSupabase.mockReturnValue(sb);

    const res = await GET(makeGetReq(UID, undefined, "Bearer admin-token"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it("returns messages for valid customer token", async () => {
    const sb = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 1, text: "Hallo", sender: "customer" }], error: null }),
    };
    mockGetSupabase.mockReturnValue(sb);

    const res = await GET(makeGetReq(UID, "customer-token-123"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(200);
    expect(sb.from).toHaveBeenCalledWith("messages");
    expect(sb.eq).toHaveBeenCalledWith("booking_uid", UID);
  });

  it("returns 401 for unauthorized request", async () => {
    const res = await GET(makeGetReq(UID), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns empty data when supabase is not configured", async () => {
    mockEnv.mockReturnValue("");
    mockVerifyAdmin.mockResolvedValue(true);
    const res = await GET(makeGetReq(UID, undefined, "Bearer admin"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual([]);
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimitIP.mockResolvedValue(false);
    const res = await GET(makeGetReq(UID, undefined, "Bearer admin"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(429);
  });

  it("returns 500 when supabase query fails", async () => {
    mockVerifyAdmin.mockResolvedValue(true);
    const sb = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "Supabase error" } }),
    };
    mockGetSupabase.mockReturnValue(sb);

    const res = await GET(makeGetReq(UID, undefined, "Bearer admin"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(500);
  });
});

describe("POST /api/bookings/[uid]/messages", () => {
  const UID = "booking-abc";

  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitIP.mockResolvedValue(true);
    mockVerifyAdmin.mockResolvedValue(false);
    mockValidOrigin.mockReturnValue(true);
    mockGetBookingByUid.mockResolvedValue({
      data: { metadata: { access_token: "customer-token-123" } },
    });
    mockSanitize.mockImplementation((v: string) => v?.trim() ?? "");
    mockEnv.mockImplementation((name: string) => {
      if (name === "SUPABASE_URL") return "https://supabase.co";
      if (name === "SUPABASE_SERVICE_KEY") return "key";
      if (name === "ADMIN_EMAIL") return "admin@example.com";
      return "";
    });
  });

  function mockSuccessSupabase() {
    return {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 2, text: "Hi", sender: "customer" }, error: null }),
    };
  }

  it("inserts a message from customer with valid token", async () => {
    const sb = mockSuccessSupabase();
    mockGetSupabase.mockReturnValue(sb);
    const res = await POST(makePostReq(UID, { text: "Hallo!" }, "customer-token-123"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(200);
    expect(sb.insert).toHaveBeenCalledWith({
      booking_uid: UID,
      sender: "customer",
      text: "Hallo!",
      image_urls: null,
    });
  });

  it("inserts a message from admin", async () => {
    mockVerifyAdmin.mockResolvedValue(true);
    const sb = mockSuccessSupabase();
    mockGetSupabase.mockReturnValue(sb);
    const res = await POST(makePostReq(UID, { text: "Antwort vom Admin" }, undefined, "Bearer admin-token"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(200);
    expect(sb.insert).toHaveBeenCalledWith({
      booking_uid: UID,
      sender: "admin",
      text: "Antwort vom Admin",
      image_urls: null,
    });
  });

  it("returns 400 when text and imageUrls are empty", async () => {
    mockVerifyAdmin.mockResolvedValue(true);
    const res = await POST(makePostReq(UID, {}, undefined, "Bearer admin"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Text oder Bilder erforderlich");
  });

  it("returns 401 for unauthorized request", async () => {
    const res = await POST(makePostReq(UID, { text: "Hi" }), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for invalid origin", async () => {
    mockValidOrigin.mockReturnValue(false);
    mockVerifyAdmin.mockResolvedValue(true);
    const res = await POST(makePostReq(UID, { text: "Hi" }, undefined, "Bearer admin"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimitIP.mockResolvedValue(false);
    const res = await POST(makePostReq(UID, { text: "Hi" }, "customer-token-123"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(429);
  });

  it("returns 503 when supabase is not configured", async () => {
    mockEnv.mockReturnValue("");
    mockVerifyAdmin.mockResolvedValue(true);
    const res = await POST(makePostReq(UID, { text: "Hi" }, undefined, "Bearer admin"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(503);
  });

  it("returns 500 when insert fails", async () => {
    mockVerifyAdmin.mockResolvedValue(true);
    const sb = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Insert failed" } }),
    };
    mockGetSupabase.mockReturnValue(sb);

    const res = await POST(makePostReq(UID, { text: "Hi" }, undefined, "Bearer admin"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(500);
  });
});
