import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRateLimitIP = vi.hoisted(() => vi.fn());
const mockGetAllBookings = vi.hoisted(() => vi.fn());
const mockVerifyAdmin = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rate-limit", () => ({ rateLimitIP: mockRateLimitIP }));
vi.mock("@/lib/cal", () => ({ getAllBookings: mockGetAllBookings }));
vi.mock("@/lib/admin-auth", () => ({ verifyAdmin: mockVerifyAdmin }));
vi.mock("@/lib/cors", () => ({
  addCorsStrict: vi.fn((res) => res),
  corsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { GET } from "@/app/api/bookings/route";
import { NextRequest } from "next/server";

function makeReq(auth?: string): NextRequest {
  const headers: Record<string, string> = { host: "localhost:3000" };
  if (auth) headers.authorization = auth;
  return new NextRequest("http://localhost:3000/api/bookings", { headers });
}

describe("GET /api/bookings (all bookings)", () => {
  const mockBookings = {
    data: [
      { uid: "1", name: "Booking A", metadata: { access_token: "secret", vehicle: "VW" } },
      { uid: "2", name: "Booking B", metadata: { accessToken: "secret", vehicle: "BMW" } },
      { uid: "3", name: "Booking C", metadata: { vehicle: "Audi" } },
      { uid: "4", name: "Booking D" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitIP.mockResolvedValue(true);
    mockVerifyAdmin.mockResolvedValue(true);
    mockGetAllBookings.mockResolvedValue(mockBookings);
  });

  it("returns all bookings for admin", async () => {
    const res = await GET(makeReq("Bearer admin-token"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(4);
  });

  it("strips access tokens from metadata", async () => {
    const res = await GET(makeReq("Bearer admin-token"));
    const json = await res.json();
    expect(json.data[0].metadata.access_token).toBeUndefined();
    expect(json.data[0].metadata.accessToken).toBeUndefined();
    expect(json.data[0].metadata.vehicle).toBe("VW");
    expect(json.data[1].metadata.accessToken).toBeUndefined();
    expect(json.data[1].metadata.vehicle).toBe("BMW");
    expect(json.data[2].metadata.vehicle).toBe("Audi");
    expect(json.data[3].metadata).toBeUndefined();
  });

  it("returns 401 for non-admin", async () => {
    mockVerifyAdmin.mockResolvedValue(false);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimitIP.mockResolvedValue(false);
    const res = await GET(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns 500 on API failure", async () => {
    mockGetAllBookings.mockRejectedValue(new Error("Cal.com error"));
    const res = await GET(makeReq("Bearer admin-token"));
    expect(res.status).toBe(500);
  });
});
