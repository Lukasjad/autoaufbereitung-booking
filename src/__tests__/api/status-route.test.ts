import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/cal", () => ({
  getBookingByUid: vi.fn(),
  confirmBooking: vi.fn(),
  declineBooking: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendBookingApproved: vi.fn().mockReturnValue(Promise.resolve()),
  sendBookingRejected: vi.fn().mockReturnValue(Promise.resolve()),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitIP: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdmin: vi.fn(),
}));

vi.mock("@/lib/cors", () => ({
  addCorsStrict: vi.fn((res) => res),
  corsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { POST } from "@/app/api/bookings/[uid]/status/route";

// Named import mocks after module imports so vitest resolves them from the mock cache
import * as cal from "@/lib/cal";
import * as email from "@/lib/email";
import * as rateLimit from "@/lib/rate-limit";
import * as adminAuth from "@/lib/admin-auth";

function createRequest(body: unknown, headers: Record<string, string> = {}): Request {
  const h = new Headers({
    "content-type": "application/json",
    host: "localhost:3000",
    ...headers,
  });
  return new Request("http://localhost:3000/api/bookings/uid-123/status", {
    method: "POST",
    headers: h,
    body: JSON.stringify(body),
  });
}

describe("POST /api/bookings/[uid]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit.rateLimitIP).mockResolvedValue(true);
    vi.mocked(adminAuth.verifyAdmin).mockResolvedValue(true);
    vi.mocked(cal.confirmBooking).mockResolvedValue({});
    vi.mocked(cal.declineBooking).mockResolvedValue({});
    vi.mocked(cal.getBookingByUid).mockResolvedValue({
      data: {
        uid: "uid-123",
        start: "2026-07-15T14:00:00Z",
        status: "pending",
        attendees: [
          { name: "Max Mustermann", email: "max@test.de" },
        ],
        metadata: {
          service: "Innenreinigung",
          access_token: "customer-token-xyz",
        },
      },
    });
  });

  it("approves booking and sends acceptance email", async () => {
    const req = createRequest({ status: "ACCEPTED" }, { authorization: "Bearer admin-pw" });
    const res = await POST(req, { params: Promise.resolve({ uid: "uid-123" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.status).toBe("ACCEPTED");

    expect(cal.confirmBooking).toHaveBeenCalledWith("uid-123");
    expect(email.sendBookingApproved).toHaveBeenCalledTimes(1);
    expect(vi.mocked(email.sendBookingApproved).mock.calls[0][0].to).toBe("max@test.de");
    expect(vi.mocked(email.sendBookingApproved).mock.calls[0][0].name).toBe("Max Mustermann");
    expect(vi.mocked(email.sendBookingApproved).mock.calls[0][0].terminLink).toContain("uid-123");
    expect(email.sendBookingRejected).not.toHaveBeenCalled();
  });

  it("rejects booking and sends rejection email", async () => {
    const req = createRequest({ status: "REJECTED" }, { authorization: "Bearer admin-pw" });
    const res = await POST(req, { params: Promise.resolve({ uid: "uid-123" }) });

    expect(res.status).toBe(200);
    expect(cal.declineBooking).toHaveBeenCalledWith("uid-123");
    expect(email.sendBookingRejected).toHaveBeenCalledTimes(1);
    expect(email.sendBookingApproved).not.toHaveBeenCalled();
  });

  it("returns 401 without auth header", async () => {
    vi.mocked(adminAuth.verifyAdmin).mockResolvedValue(false);
    const req = createRequest({ status: "ACCEPTED" });
    const res = await POST(req, { params: Promise.resolve({ uid: "uid-123" }) });
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong password", async () => {
    vi.mocked(adminAuth.verifyAdmin).mockResolvedValue(false);
    const req = createRequest({ status: "ACCEPTED" }, { authorization: "Bearer wrong-pw" });
    const res = await POST(req, { params: Promise.resolve({ uid: "uid-123" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid status value", async () => {
    const req = createRequest({ status: "INVALID" }, { authorization: "Bearer admin-pw" });
    const res = await POST(req, { params: Promise.resolve({ uid: "uid-123" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("ACCEPTED oder REJECTED");
  });

  it("returns 400 for missing status", async () => {
    const req = createRequest({}, { authorization: "Bearer admin-pw" });
    const res = await POST(req, { params: Promise.resolve({ uid: "uid-123" }) });
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(rateLimit.rateLimitIP).mockResolvedValue(false);
    const req = createRequest({ status: "ACCEPTED" }, { authorization: "Bearer admin-pw" });
    const res = await POST(req, { params: Promise.resolve({ uid: "uid-123" }) });
    expect(res.status).toBe(429);
  });

  it("returns 404 when booking not found", async () => {
    vi.mocked(cal.getBookingByUid).mockResolvedValue({ data: null });
    const req = createRequest({ status: "ACCEPTED" }, { authorization: "Bearer admin-pw" });
    const res = await POST(req, { params: Promise.resolve({ uid: "uid-123" }) });
    expect(res.status).toBe(404);
  });

  it("handles errors from Cal.com API", async () => {
    vi.mocked(cal.confirmBooking).mockRejectedValue(new Error("Cal.com down"));
    const req = createRequest({ status: "ACCEPTED" }, { authorization: "Bearer admin-pw" });
    const res = await POST(req, { params: Promise.resolve({ uid: "uid-123" }) });
    expect(res.status).toBe(500);
  });

  it("sanitizes attendee name in email", async () => {
    vi.mocked(cal.getBookingByUid).mockResolvedValue({
      data: {
        uid: "uid-123",
        start: "2026-07-15T14:00:00Z",
        status: "pending",
        attendees: [
          { name: "<b>Max</b>", email: "max@test.de" },
        ],
        metadata: { service: "Test", access_token: "tok" },
      },
    });
    const req = createRequest({ status: "ACCEPTED" }, { authorization: "Bearer admin-pw" });
    await POST(req, { params: Promise.resolve({ uid: "uid-123" }) });
    expect(vi.mocked(email.sendBookingApproved).mock.calls[0][0].name).toBe("Max");
  });
});
