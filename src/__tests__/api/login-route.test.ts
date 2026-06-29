import { describe, it, expect, vi, beforeEach } from "vitest";

const mockEnv = vi.hoisted(() => vi.fn());
const mockCreateAdminSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env", () => ({ env: mockEnv }));
vi.mock("@/lib/admin-auth", () => ({
  createAdminSession: mockCreateAdminSession,
}));
vi.mock("@/lib/cors", () => ({
  corsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
  compare: vi.fn(),
}));

import bcrypt from "bcryptjs";
import { POST } from "@/app/api/admin/login/route";
import { NextRequest } from "next/server";

function makeReq(body: unknown, origin?: string): NextRequest {
  return new NextRequest(
    new Request("http://localhost:3000/api/admin/login", {
      method: "POST",
      headers: origin ? { origin } : {},
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/admin/login", () => {
  const VALID_HASH = Buffer.from("$2b$10$somehash").toString("base64");

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.mockImplementation((name: string) => (name === "ADMIN_PASSWORD_HASH" ? VALID_HASH : ""));
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    mockCreateAdminSession.mockReturnValue("admin-session-token-123");
  });

  it("returns token on valid password", async () => {
    const res = await POST(makeReq({ password: "correct-password" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toBe("admin-session-token-123");
  });

  it("returns 401 for wrong password", async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    const res = await POST(makeReq({ password: "wrong-password" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Falsches Passwort");
  });

  it("returns 400 for missing password", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Passwort erforderlich");
  });

  it("returns 400 for non-string password", async () => {
    const res = await POST(makeReq({ password: 123 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Passwort erforderlich");
  });

  it("returns 500 when ADMIN_PASSWORD_HASH is not configured", async () => {
    mockEnv.mockReturnValue("");
    const res = await POST(makeReq({ password: "admin123" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Admin nicht konfiguriert");
  });

  it("sets Access-Control-Allow-Origin when origin is present", async () => {
    const res = await POST(makeReq({ password: "admin123" }, "https://example.com"));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://example.com");
  });

  it("returns 500 when JSON parsing fails", async () => {
    const req = new NextRequest(
      new Request("http://localhost:3000/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json",
      }),
    );
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
