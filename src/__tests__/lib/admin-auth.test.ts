import { describe, it, expect, vi, beforeEach } from "vitest";

const mockEnv = vi.hoisted(() => vi.fn());
vi.mock("@/lib/env", () => ({ env: mockEnv }));

import { createAdminSession, verifyAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

function makeRequest(auth?: string, ip?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (auth) headers["authorization"] = auth;
  if (ip) headers["x-forwarded-for"] = ip;
  return new NextRequest(new Request("http://localhost:3000", { headers }));
}

describe("createAdminSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockEnv.mockReturnValue("test-master-key");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a token with two dot-separated parts", () => {
    const token = createAdminSession();
    expect(token.split(".")).toHaveLength(2);
  });

  it("produces different tokens on each call", () => {
    const t1 = createAdminSession();
    vi.advanceTimersByTime(1000);
    const t2 = createAdminSession();
    expect(t1).not.toBe(t2);
  });

  it("uses fallback key when ENV_MASTER_KEY is not set", () => {
    mockEnv.mockReturnValue("");
    const token = createAdminSession();
    expect(token.split(".")).toHaveLength(2);
  });
});

describe("verifyAdmin with session token", () => {
  const VALID_BCRYPT_HASH = Buffer.from("$2b$10$SomeValidBcryptHashThatIsLongEnoughForTesting!").toString("base64");

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    mockEnv.mockImplementation((name: string) => {
      if (name === "ENV_MASTER_KEY") return "test-master-key";
      if (name === "ADMIN_PASSWORD_HASH") return VALID_BCRYPT_HASH;
      return "";
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a valid session token", async () => {
    const token = createAdminSession();
    const req = makeRequest(`Bearer ${token}`);
    expect(await verifyAdmin(req)).toBe(true);
  });

  it("rejects malformed token", async () => {
    const req = makeRequest("Bearer not-a-token");
    expect(await verifyAdmin(req)).toBe(false);
  });

  it("rejects when no auth header", async () => {
    expect(await verifyAdmin(makeRequest())).toBe(false);
  });

  it("rejects expired session token", async () => {
    const { createHmac, createHash } = await import("crypto");
    const secret = createHash("sha256").update("test-master-key").digest();
    const past = Math.floor(Date.now() / 1000) - 90000;
    const payload = Buffer.from(JSON.stringify({ sub: "admin", iat: past, exp: past - 1 })).toString("base64url");
    const sig = createHmac("sha256", secret).update(payload).digest("base64url");
    const expired = `${payload}.${sig}`;
    const req = makeRequest(`Bearer ${expired}`);
    expect(await verifyAdmin(req)).toBe(false);
  });

  it("rejects token with wrong sub claim", async () => {
    const { createHmac, createHash } = await import("crypto");
    const secret = createHash("sha256").update("test-master-key").digest();
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;
    const payload = Buffer.from(JSON.stringify({ sub: "user", iat, exp })).toString("base64url");
    const sig = createHmac("sha256", secret).update(payload).digest("base64url");
    const token = `${payload}.${sig}`;
    const req = makeRequest(`Bearer ${token}`);
    expect(await verifyAdmin(req)).toBe(false);
  });

  it("rejects token signed with different key", async () => {
    const { createHmac, createHash } = await import("crypto");
    const wrongSecret = createHash("sha256").update("wrong-key").digest();
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;
    const payload = Buffer.from(JSON.stringify({ sub: "admin", iat, exp })).toString("base64url");
    const sig = createHmac("sha256", wrongSecret).update(payload).digest("base64url");
    const token = `${payload}.${sig}`;
    const req = makeRequest(`Bearer ${token}`);
    expect(await verifyAdmin(req)).toBe(false);
  });
});

describe("verifyAdmin brute-force lockout", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    mockEnv.mockImplementation((name: string) => {
      if (name === "ENV_MASTER_KEY") return "test-master-key";
      if (name === "ADMIN_PASSWORD_HASH") return Buffer.from("$2b$10$SomeValidBcryptHash").toString("base64");
      return "";
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("locks out after 1 failed attempt (code sets lockedUntil immediately)", async () => {
    const IP = "10.0.0.1";
    const req = () => makeRequest("Bearer wrong-password", IP);

    expect(await verifyAdmin(req())).toBe(false);
    expect(await verifyAdmin(req())).toBe(false);
  });

  it("allows different IPs independently", async () => {
    const ip1 = makeRequest("Bearer wrong", "1.1.1.1");
    const ip2 = makeRequest("Bearer wrong", "2.2.2.2");

    expect(await verifyAdmin(ip1)).toBe(false);
    expect(await verifyAdmin(ip1)).toBe(false);

    expect(await verifyAdmin(ip2)).toBe(false);
  });

  it("lockout expires after WINDOW_MS", async () => {
    const IP = "10.0.0.3";
    const req = makeRequest("Bearer wrong", IP);
    await verifyAdmin(req);
    vi.advanceTimersByTime(5 * 60_000 + 1);
    expect(await verifyAdmin(req)).toBe(false);
  });
});
