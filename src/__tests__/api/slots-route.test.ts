import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAvailableSlots = vi.hoisted(() => vi.fn());
const mockGetBookingsForDate = vi.hoisted(() => vi.fn());
const mockRateLimitIP = vi.hoisted(() => vi.fn());
const mockGetOrigin = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cal", () => ({
  getAvailableSlots: mockGetAvailableSlots,
  getBookingsForDate: mockGetBookingsForDate,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitIP: mockRateLimitIP,
}));

vi.mock("@/lib/cors", () => ({
  addCors: vi.fn((res) => res),
  corsResponse: vi.fn(() => new Response(null, { status: 204 })),
  getOrigin: mockGetOrigin,
}));

import { GET } from "@/app/api/slots/route";
import { NextRequest } from "next/server";

function createReq(date?: string, timeZone?: string): NextRequest {
  let url = "http://localhost:3000/api/slots";
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (timeZone) params.set("timeZone", timeZone);
  const qs = params.toString();
  if (qs) url += `?${qs}`;
  return new NextRequest(url, { headers: { host: "localhost:3000" } });
}

describe("GET /api/slots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitIP.mockResolvedValue(true);
    mockGetOrigin.mockReturnValue("http://localhost:3000");
    mockGetAvailableSlots.mockResolvedValue({
      slots: {
        "2026-07-15": [
          { start: "2026-07-15T09:00:00Z" },
          { start: "2026-07-15T10:00:00Z" },
        ],
      },
    });
    mockGetBookingsForDate.mockResolvedValue({ data: [] });
  });

  it("returns available slots for valid date", async () => {
    const res = await GET(createReq("2026-07-15"));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.slots["2026-07-15"]).toHaveLength(2);
    expect(json.slots["2026-07-15_booked"]).toBeUndefined();
  });

  it("returns 400 when date parameter is missing", async () => {
    const res = await GET(createReq());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("date parameter required");
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimitIP.mockResolvedValue(false);
    const res = await GET(createReq("2026-07-15"));
    expect(res.status).toBe(429);
  });

  it("uses Europe/Berlin as default timezone", async () => {
    await GET(createReq("2026-07-15"));
    expect(mockGetAvailableSlots).toHaveBeenCalledWith("2026-07-15", "Europe/Berlin");
  });

  it("passes custom timezone", async () => {
    await GET(createReq("2026-07-15", "America/New_York"));
    expect(mockGetAvailableSlots).toHaveBeenCalledWith("2026-07-15", "America/New_York");
  });

  it("handles Cal.com API failure gracefully", async () => {
    mockGetAvailableSlots.mockRejectedValue(new Error("Cal.com error 500"));
    const res = await GET(createReq("2026-07-15"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("Cal.com error");
  });
});
