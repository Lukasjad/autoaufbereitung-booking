import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRateLimitIP = vi.hoisted(() => vi.fn());
const mockGetBookingByUid = vi.hoisted(() => vi.fn());
const mockVerifyAdmin = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rate-limit", () => ({ rateLimitIP: mockRateLimitIP }));
vi.mock("@/lib/cal", () => ({ getBookingByUid: mockGetBookingByUid }));
vi.mock("@/lib/admin-auth", () => ({ verifyAdmin: mockVerifyAdmin }));
vi.mock("@/lib/cors", () => ({
  addCorsStrict: vi.fn((res) => res),
  corsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { GET } from "@/app/api/bookings/[uid]/route";
import { NextRequest } from "next/server";

function makeReq(uid: string, token?: string, auth?: string): NextRequest {
  let url = `http://localhost:3000/api/bookings/${uid}`;
  if (token) url += `?token=${token}`;
  const headers: Record<string, string> = { host: "localhost:3000" };
  if (auth) headers.authorization = auth;
  return new NextRequest(url, { headers });
}

describe("GET /api/bookings/[uid]", () => {
  const UID = "uid-123";
  const mockData = {
    data: {
      uid: UID,
      customerName: "Max",
      customerEmail: "max@example.com",
      vehicle: "VW Golf",
      start: "2026-07-15T09:00:00Z",
      metadata: {
        access_token: "secret-token",
        vehicle: "VW Golf",
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitIP.mockResolvedValue(true);
    mockGetBookingByUid.mockResolvedValue(mockData);
    mockVerifyAdmin.mockResolvedValue(false);
  });

  it("returns full booking data for admin", async () => {
    mockVerifyAdmin.mockResolvedValue(true);
    const res = await GET(makeReq(UID, undefined, "Bearer admin-token"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.customerEmail).toBe("max@example.com");
    expect(json.data.metadata.access_token).toBe("secret-token");
  });

  it("strips access tokens for customer access", async () => {
    mockGetBookingByUid.mockResolvedValue({
      data: { ...mockData.data, metadata: { access_token: "secret", accessToken: "secret2", vehicle: "BMW" } },
    });
    const res = await GET(makeReq(UID, "secret"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.metadata.access_token).toBeUndefined();
    expect(json.data.metadata.accessToken).toBeUndefined();
    expect(json.data.metadata.vehicle).toBe("BMW");
  });

  it("returns 401 for unauthorized request", async () => {
    const res = await GET(makeReq(UID), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimitIP.mockResolvedValue(false);
    const res = await GET(makeReq(UID, "token"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(429);
  });

  it("returns 500 on API error", async () => {
    mockGetBookingByUid.mockRejectedValue(new Error("Cal.com API error"));
    const res = await GET(makeReq(UID, "token"), {
      params: Promise.resolve({ uid: UID }),
    });
    expect(res.status).toBe(500);
  });
});
