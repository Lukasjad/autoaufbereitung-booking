import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateBooking = vi.hoisted(() => vi.fn());
const mockUpdateBookingLocation = vi.hoisted(() => vi.fn());
const mockSendBookingPending = vi.hoisted(() => vi.fn());
const mockRateLimitIP = vi.hoisted(() => vi.fn());
const mockGenerateLinkId = vi.hoisted(() => vi.fn());
const mockGetOrigin = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cal", () => ({
  createBooking: mockCreateBooking,
  updateBookingLocation: mockUpdateBookingLocation,
}));

vi.mock("@/lib/email", () => ({
  sendBookingPending: mockSendBookingPending,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitIP: mockRateLimitIP,
}));

vi.mock("@/lib/id", () => ({
  generateLinkId: mockGenerateLinkId,
}));

vi.mock("@/lib/cors", () => ({
  addCors: vi.fn((res) => res),
  corsResponse: vi.fn(() => new Response(null, { status: 204 })),
  getOrigin: mockGetOrigin,
}));

vi.mock("@/lib/env", () => ({
  env: () => "",
}));

import { POST } from "@/app/api/book/route";

function createRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  const h = new Headers({
    "content-type": "application/json",
    host: "localhost:3000",
    ...headers,
  });
  return new Request("http://localhost:3000/api/book", {
    method: "POST",
    headers: h,
    body: JSON.stringify(body),
  });
}

describe("POST /api/book", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitIP.mockResolvedValue(true);
    mockGenerateLinkId.mockReturnValue("abc12345");
    mockGetOrigin.mockReturnValue("http://localhost:3000");
    mockCreateBooking.mockResolvedValue({ data: { uid: "cal-booking-uid" } });
    mockUpdateBookingLocation.mockResolvedValue({});
    mockSendBookingPending.mockResolvedValue(undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue("access-token");
  });

  const validBody = {
    start: "2026-07-15T14:00:00Z",
    attendee: {
      name: "Max Mustermann",
      email: "max@test.de",
      timeZone: "Europe/Berlin",
    },
    metadata: {
      service: "Innenreinigung",
      fahrzeugmarke: "BMW",
      fahrzeugmodell: "3er",
      kennzeichen: "AB-CD 123",
      baujahr: "2019",
      treibstoff: "Diesel",
      kilometerstand: "85000",
    },
  };

  it("creates booking successfully", async () => {
    const res = await POST(createRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.terminLink).toContain("/termin/cal-booking-uid");
    expect(json.shortLink).toContain("/s/abc12345");
    expect(json.accessToken).toBeTruthy();

    const createCall = mockCreateBooking.mock.calls[0][0];
    expect(createCall.start).toBe("2026-07-15T14:00:00Z");
    expect(createCall.attendee.email).toBe("max@test.de");
    expect(createCall.description).toBeUndefined();
    expect(createCall.status).toBeUndefined();

    expect(mockUpdateBookingLocation).toHaveBeenCalledTimes(1);
    const updateCall = mockUpdateBookingLocation.mock.calls[0];
    expect(updateCall[0]).toBe("cal-booking-uid");
    expect(updateCall[1]).toBe("http://localhost:3000/portal/cal-booking-uid?token=access-token");
  });

  it("rejects missing start", async () => {
    const { start, ...noStart } = validBody;
    const res = await POST(createRequest(noStart as any));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Termin");
  });

  it("rejects invalid email", async () => {
    const res = await POST(
      createRequest({ ...validBody, attendee: { ...validBody.attendee, email: "invalid" } })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("E-Mail");
  });

  it("rejects invalid kennzeichen", async () => {
    const res = await POST(
      createRequest({ ...validBody, metadata: { ...validBody.metadata, kennzeichen: "wrong" } })
    );
    expect(res.status).toBe(400);
  });

  it("rejects when rate limited", async () => {
    mockRateLimitIP.mockResolvedValue(false);
    const res = await POST(createRequest(validBody));
    expect(res.status).toBe(429);
  });

  it("handles Cal.com API failure", async () => {
    mockCreateBooking.mockRejectedValue(new Error("Cal.com API down"));
    const res = await POST(createRequest(validBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Cal.com API down");
  });

  it("succeeds even when email fails", async () => {
    mockSendBookingPending.mockRejectedValue(new Error("SendGrid down"));
    const res = await POST(createRequest(validBody));
    expect(res.status).toBe(200);
  });

  it("handles phone number formatting", async () => {
    const bodyWithPhone = {
      ...validBody,
      attendee: { ...validBody.attendee, telefon: "01751234567" },
    };
    await POST(createRequest(bodyWithPhone));

    const createCall = mockCreateBooking.mock.calls[0][0];
    expect(createCall.attendee.phoneNumber).toBe("+491751234567");
  });

  it("sends all booking fields responses to Cal.com", async () => {
    const meta = {
      ...validBody.metadata,
      service: "Innenreinigung",
      schadensbeschreibung: "Kratzer auf der Motorhaube",
      notizen: "Bitte ohne Politur",
      bilder: "https://example.com/schaden1.jpg,https://example.com/schaden2.jpg",
    };
    await POST(createRequest({ ...validBody, metadata: meta }));

    const bfr = mockCreateBooking.mock.calls[0][0].bookingFieldsResponses;
    expect(bfr.fahrzeugmarke).toBe("BMW");
    expect(bfr.fahrzeugmodell).toBe("3er");
    expect(bfr.kennzeichen).toBe("AB-CD 123");
    expect(bfr.schadensbilder).toBe("https://example.com/schaden1.jpg");
    expect(bfr.service).toBe("Innenreinigung");
    expect(bfr.schadensbeschreibung).toBe("Kratzer auf der Motorhaube");
    expect(bfr.notizen).toBe("Bitte ohne Politur");
  });
});
