import { describe, it, expect, vi, beforeEach } from "vitest";

function createEnvMock(apiKey: string, eventTypeId: string) {
  return {
    env: (name: string) => {
      if (name === "CAL_API_KEY") return apiKey;
      if (name === "CAL_EVENT_TYPE_ID") return eventTypeId;
      return "";
    },
  };
}

vi.mock("@/lib/env", () => createEnvMock("cal_key_123", "42"));

import { createBooking, getBookingByUid, confirmBooking, declineBooking, getAllBookings, getAvailableSlots } from "@/lib/cal";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function okResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response);
}

function errorResponse(status: number, body: string) {
  return Promise.resolve({
    ok: false,
    status,
    text: () => Promise.resolve(body),
  } as Response);
}

describe("cal.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createBooking", () => {
    const validData = {
      start: "2026-07-01T10:00:00Z",
      attendee: { name: "Max", email: "max@test.de", timeZone: "Europe/Berlin" },
      location: "https://example.com/s/abc123",
      metadata: { service: "Innenreinigung" },
      bookingFieldsResponses: { kennzeichen: "AB-CD 123" },
    };

    it("sends POST to Cal.com and returns result", async () => {
      const expectedResponse = { data: { uid: "booking-uid-1" } };
      mockFetch.mockResolvedValueOnce(okResponse(expectedResponse));

      const result = await createBooking(validData);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe("https://api.cal.com/v2/bookings");
      expect(call[1].method).toBe("POST");
      expect(call[1].headers.Authorization).toBe("Bearer cal_key_123");

      const body = JSON.parse(call[1].body);
      expect(body.eventTypeId).toBe(42);
      expect(body.start).toBe("2026-07-01T10:00:00Z");
      expect(body.attendee.email).toBe("max@test.de");
      expect(body.location).toBe("https://example.com/s/abc123");
      expect(body.metadata.service).toBe("Innenreinigung");
      expect(body.bookingFieldsResponses.kennzeichen).toBe("AB-CD 123");
      expect(body.description).toBeUndefined();
      expect(body.status).toBeUndefined();

      expect(result).toEqual(expectedResponse);
    });

    it("does not include location when not provided", async () => {
      const { location, ...noLocation } = validData;
      mockFetch.mockResolvedValueOnce(okResponse({}));

      await createBooking(noLocation);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.location).toBeUndefined();
    });

    it("throws when Cal.com returns error", async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(400, '{"error":"bad request"}'));

      await expect(createBooking(validData)).rejects.toThrow("Cal.com booking error 400");
    });
  });

  describe("confirmBooking", () => {
    it("sends POST to confirm endpoint", async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ data: { status: "accepted" } }));

      const result = await confirmBooking("uid-123");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.cal.com/v2/bookings/uid-123/confirm");
      expect(opts.method).toBe("POST");
      expect(result.data.status).toBe("accepted");
    });

    it("throws on error", async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(400, '{"error":"bad"}'));
      await expect(confirmBooking("uid-123")).rejects.toThrow("Cal.com confirm error 400");
    });
  });

  describe("declineBooking", () => {
    it("sends POST to decline endpoint", async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ data: { status: "rejected" } }));

      const result = await declineBooking("uid-123", "Not available");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.cal.com/v2/bookings/uid-123/decline");
      expect(opts.method).toBe("POST");
      expect(JSON.parse(opts.body)).toEqual({ reason: "Not available" });
      expect(result.data.status).toBe("rejected");
    });

    it("works without reason", async () => {
      mockFetch.mockResolvedValueOnce(okResponse({}));

      await declineBooking("uid-123");

      const opts = mockFetch.mock.calls[0][1];
      expect(opts.body).toBeUndefined();
    });

    it("throws on error", async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(500, "error"));
      await expect(declineBooking("uid-123")).rejects.toThrow("Cal.com decline error 500");
    });
  });

  describe("getBookingByUid", () => {
    it("fetches booking and normalizes metadata", async () => {
      const raw = {
        data: {
          uid: "uid-1",
          attendees: [
            {
              metadata: { service: "Innenreinigung" },
              bookingFieldsResponses: { kennzeichen: "M-AB 1" },
            },
          ],
        },
      };
      mockFetch.mockResolvedValueOnce(okResponse(raw));

      const result = await getBookingByUid("uid-1");
      expect(result.data.metadata).toEqual({ service: "Innenreinigung" });
      expect(result.data.bookingFieldsResponses).toEqual({ kennzeichen: "M-AB 1" });
    });

    it("throws on error", async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(404, "Not found"));

      await expect(getBookingByUid("invalid")).rejects.toThrow("Cal.com booking error 404");
    });
  });

  describe("getAllBookings", () => {
    it("fetches all bookings", async () => {
      const data = { data: [{ uid: "1" }, { uid: "2" }] };
      mockFetch.mockResolvedValueOnce(okResponse(data));

      const result = await getAllBookings();
      expect(mockFetch.mock.calls[0][0]).toContain("eventTypeId=42");
      expect(mockFetch.mock.calls[0][0]).toContain("unconfirmed");
      expect(result.data).toHaveLength(2);
    });
  });

  describe("getAvailableSlots", () => {
    it("returns slots on success", async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ slots: { "2026-07-01": ["10:00"] } }));

      const result = await getAvailableSlots("2026-07-01", "Europe/Berlin");
      expect(result.slots["2026-07-01"]).toEqual(["10:00"]);
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(500, "error"));

      await expect(getAvailableSlots("2026-07-01", "Europe/Berlin")).rejects.toThrow(
        "Cal.com slots error 500: error"
      );
    });
  });
});
