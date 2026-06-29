import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.hoisted(() => vi.fn());
const mockSetApiKey = vi.hoisted(() => vi.fn());

vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: mockSetApiKey,
    send: mockSend,
  },
}));

vi.mock("@/lib/env", () => ({
  env: (name: string) => {
    if (name === "SENDGRID_API_KEY") return "sg_test_key";
    if (name === "SENDGRID_FROM") return "lui.jad@gmx.de";
    return "";
  },
}));

import { sendBookingPending, sendBookingApproved, sendBookingRejected, sendBookingConfirmation, sendAdminNewMessageNotification } from "@/lib/email";

describe("email.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseParams = {
    to: "kunde@test.de",
    name: "Max Mustermann",
    service: "Innenreinigung",
    start: "2026-07-15T14:00:00Z",
    terminLink: "https://example.com/termin/abc123?token=xyz",
    shortLink: "https://example.com/s/abc123",
  };

  describe("sendBookingPending", () => {
    it("sends email with correct params", async () => {
      mockSend.mockResolvedValueOnce([{ statusCode: 202 }]);

      await sendBookingPending(baseParams);

      expect(mockSetApiKey).toHaveBeenCalledWith("sg_test_key");
      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.from).toBe("lui.jad@gmx.de");
      expect(call.to).toBe("kunde@test.de");
      expect(call.subject).toBe("Buchung eingegangen – wartet auf Bestätigung");
      expect(call.html).toContain("Buchung eingegangen");
      expect(call.html).toContain("Max Mustermann");
      expect(call.html).toContain("Innenreinigung");
      expect(call.html).toContain("https://example.com/termin/abc123?token=xyz");
    });

    it("throws when SendGrid fails", async () => {
      mockSend.mockRejectedValueOnce(new Error("SendGrid failure"));

      await expect(sendBookingPending(baseParams)).rejects.toThrow("SendGrid failure");
    });
  });

  describe("sendBookingApproved", () => {
    it("sends acceptance email", async () => {
      mockSend.mockResolvedValueOnce([{ statusCode: 202 }]);

      await sendBookingApproved(baseParams);

      expect(mockSend.mock.calls[0][0].subject).toBe("Deine Buchung wurde angenommen!");
      expect(mockSend.mock.calls[0][0].html).toContain("Buchung bestätigt");
      expect(mockSend.mock.calls[0][0].html).toContain("angenommen");
    });
  });

  describe("sendBookingRejected", () => {
    it("sends rejection email without terminLink", async () => {
      mockSend.mockResolvedValueOnce([{ statusCode: 202 }]);

      await sendBookingRejected({
        to: baseParams.to,
        name: baseParams.name,
        service: baseParams.service,
        start: baseParams.start,
      });

      expect(mockSend.mock.calls[0][0].subject).toBe("Deine Buchung wurde abgelehnt");
      expect(mockSend.mock.calls[0][0].html).toContain("Buchung abgelehnt");
      expect(mockSend.mock.calls[0][0].html).toContain("nicht bestätigt");
    });
  });

  describe("sendBookingConfirmation", () => {
    it("sends confirmation email (legacy)", async () => {
      mockSend.mockResolvedValueOnce([{ statusCode: 202 }]);

      await sendBookingConfirmation(baseParams);

      expect(mockSend.mock.calls[0][0].subject).toBe("Deine Buchung ist bestätigt");
      expect(mockSend.mock.calls[0][0].html).toContain("Buchung bestätigt");
    });
  });

  describe("sendAdminNewMessageNotification", () => {
    it("sends admin notification with customer message", async () => {
      mockSend.mockResolvedValueOnce([{ statusCode: 202 }]);

      await sendAdminNewMessageNotification({
        adminEmail: "admin@test.de",
        customerName: "Max Mustermann",
        bookingUid: "uid-123",
        service: "Innenreinigung",
        text: "Hallo, ich habe eine Frage zum Termin.",
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.to).toBe("admin@test.de");
      expect(call.subject).toContain("Max Mustermann");
      expect(call.html).toContain("Neue Nachricht");
      expect(call.html).toContain("Hallo, ich habe eine Frage zum Termin.");
      expect(call.html).toContain("uid-123");
    });
  });
});
