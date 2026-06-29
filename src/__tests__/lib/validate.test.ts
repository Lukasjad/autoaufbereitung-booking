import { describe, it, expect } from "vitest";
import { sanitize, validEmail, validPhone, validKennzeichen, validOrigin } from "@/lib/validate";

describe("sanitize", () => {
  it("removes script tags entirely (including content)", () => {
    expect(sanitize("<script>alert('xss')</script>hello")).toBe("hello");
  });

  it("trims whitespace", () => {
    expect(sanitize("  hello  ")).toBe("hello");
  });

  it("returns empty string for only HTML", () => {
    expect(sanitize("<b></b>")).toBe("");
  });

  it("preserves normal text", () => {
    expect(sanitize("Hallo Welt")).toBe("Hallo Welt");
  });

  it("strips HTML but keeps inner text", () => {
    expect(sanitize('<a href="http://evil.com">klick</a>')).toBe("klick");
  });
});

describe("validOrigin", () => {
  it("allows null origin (non-browser requests)", () => {
    expect(validOrigin(null)).toBe(true);
  });

  it("allows vercel app domain", () => {
    expect(validOrigin("https://autoaufbereitung-booking.vercel.app")).toBe(true);
  });

  it("allows localhost", () => {
    expect(validOrigin("http://localhost:3000")).toBe(true);
  });

  it("rejects external domain", () => {
    expect(validOrigin("https://evil.com")).toBe(false);
  });

  it("rejects invalid URL", () => {
    expect(validOrigin("not-a-url")).toBe(false);
  });
});

describe("validEmail", () => {
  it("accepts valid email", () => {
    expect(validEmail("test@example.com")).toBe(true);
  });

  it("rejects missing @", () => {
    expect(validEmail("testexample.com")).toBe(false);
  });

  it("rejects missing domain", () => {
    expect(validEmail("test@")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validEmail("")).toBe(false);
  });

  it("accepts email with plus sign", () => {
    expect(validEmail("test+label@example.com")).toBe(true);
  });

  it("rejects spaces", () => {
    expect(validEmail("test @example.com")).toBe(false);
  });
});

describe("validPhone", () => {
  it("accepts German mobile number", () => {
    expect(validPhone("+491751234567")).toBe(true);
  });

  it("accepts number with spaces and dashes", () => {
    expect(validPhone("+49 30 12345678")).toBe(true);
  });

  it("rejects too short number", () => {
    expect(validPhone("+4")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validPhone("")).toBe(false);
  });
});

describe("validKennzeichen", () => {
  it("accepts format AB-CD 123", () => {
    expect(validKennzeichen("AB-CD 123")).toBe(true);
  });

  it("accepts format AB CD 123", () => {
    expect(validKennzeichen("AB CD 123")).toBe(true);
  });

  it("accepts single letter city code", () => {
    expect(validKennzeichen("M-AB 1")).toBe(true);
  });

  it("accepts umlauts", () => {
    expect(validKennzeichen("Ö-AB 123")).toBe(true);
  });

  it("rejects no separator", () => {
    expect(validKennzeichen("ABCD123")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validKennzeichen("")).toBe(false);
  });
});
