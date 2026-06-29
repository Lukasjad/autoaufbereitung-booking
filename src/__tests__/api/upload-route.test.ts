import { describe, it, expect, vi, beforeEach } from "vitest";

const mockValidOrigin = vi.hoisted(() => vi.fn());
const mockRateLimitIP = vi.hoisted(() => vi.fn());

vi.mock("@/lib/validate", () => ({ validOrigin: mockValidOrigin }));
vi.mock("@/lib/rate-limit", () => ({ rateLimitIP: mockRateLimitIP }));

import { POST } from "@/app/api/upload/route";
import { NextRequest } from "next/server";

function makeReq(body?: FormData, origin?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  return new NextRequest(
    new Request("http://localhost:3000/api/upload", {
      method: "POST",
      headers,
      body: body ?? new FormData(),
    }),
  );
}

function createMockFile(name: string, size: number, type: string): File {
  const content = new ArrayBuffer(size);
  return new File([content], name, { type });
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    mockValidOrigin.mockReturnValue(true);
    mockRateLimitIP.mockResolvedValue(true);
  });

  it("returns 403 for invalid origin", async () => {
    mockValidOrigin.mockReturnValue(false);
    const form = new FormData();
    form.append("file", createMockFile("test.jpg", 100, "image/jpeg"));
    const res = await POST(makeReq(form, "https://evil.com"));
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimitIP.mockResolvedValue(false);
    const form = new FormData();
    form.append("file", createMockFile("test.jpg", 100, "image/jpeg"));
    const res = await POST(makeReq(form, "http://localhost:3000"));
    expect(res.status).toBe(429);
  });

  it("returns 400 for empty form data", async () => {
    const res = await POST(makeReq(new FormData(), "http://localhost:3000"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("No files provided");
  });

  it("returns 400 for more than MAX_FILES (10)", async () => {
    const form = new FormData();
    for (let i = 0; i < 11; i++) {
      form.append("file", createMockFile(`f${i}.jpg`, 100, "image/jpeg"));
    }
    const res = await POST(makeReq(form, "http://localhost:3000"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Max 10 Dateien");
  });

  it("returns 400 for oversized file", async () => {
    const tooBig = createMockFile("big.jpg", 9 * 1024 * 1024, "image/jpeg");
    const form = new FormData();
    form.append("file", tooBig);
    const res = await POST(makeReq(form, "http://localhost:3000"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("ist zu groß");
  });

  it("returns 400 for disallowed file type", async () => {
    const bad = createMockFile("bad.gif", 100, "image/gif");
    const form = new FormData();
    form.append("file", bad);
    const res = await POST(makeReq(form, "http://localhost:3000"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("ungültiger Dateityp");
  });

  it("uploads files successfully through presigned flow", async () => {
    const form = new FormData();
    form.append("file", createMockFile("damage.jpg", 1024, "image/jpeg"));

    const presignPayload = [{ key: "abc123", url: "https://up.uploadthing.com/fake" }];
    vi.mocked(fetch).mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url?.url ?? "";
      if (urlStr === "https://up.uploadthing.com/fake") {
        return new Response(null, { status: 200 });
      }
      if (urlStr.includes("uploadthing") && urlStr.includes("actionType=upload")) {
        return new Response(JSON.stringify(presignPayload), { status: 200 });
      }
      if (urlStr.includes("uploadthing") && urlStr.includes("actionType=callback")) {
        return new Response(JSON.stringify({ data: [{ ufsUrl: "https://utfs.io/f/abc123" }] }), { status: 200 });
      }
      return new Response(null, { status: 404 });
    });

    const res = await POST(makeReq(form, "http://localhost:3000"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.urls).toEqual(["https://utfs.io/f/abc123"]);
  });

  it("falls back to utfs.io URLs when callback fails", async () => {
    const form = new FormData();
    form.append("file", createMockFile("damage.jpg", 1024, "image/jpeg"));

    vi.mocked(fetch).mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url?.url ?? "";
      if (urlStr.includes("uploadthing") && urlStr.includes("actionType=upload")) {
        return new Response(JSON.stringify([{ key: "fallback-key", url: "https://up.uploadthing.com/fake" }]), { status: 200 });
      }
      if (urlStr === "https://up.uploadthing.com/fake") {
        return new Response(null, { status: 200 });
      }
      if (urlStr.includes("uploadthing") && urlStr.includes("actionType=callback")) {
        return new Response(null, { status: 500 });
      }
      return new Response(null, { status: 404 });
    });

    const res = await POST(makeReq(form, "http://localhost:3000"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.urls).toEqual(["https://utfs.io/f/fallback-key"]);
  });

  it("returns 502 when presign fails", async () => {
    const form = new FormData();
    form.append("file", createMockFile("damage.jpg", 1024, "image/jpeg"));

    vi.mocked(fetch).mockResolvedValue(new Response("Service Unavailable", { status: 503 }));

    const res = await POST(makeReq(form, "http://localhost:3000"));
    expect(res.status).toBe(502);
  });

  it("returns 502 when presigned count mismatch", async () => {
    const form = new FormData();
    form.append("file", createMockFile("a.jpg", 100, "image/jpeg"));

    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([{ key: "k1", url: "https://up.uploadthing.com/u1" }, { key: "k2", url: "https://up.uploadthing.com/u2" }]), { status: 200 }));

    const res = await POST(makeReq(form, "http://localhost:3000"));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toContain("Expected 1 presigned URLs, got 2");
  });

  it("returns 500 when upload to ingest fails", async () => {
    const form = new FormData();
    form.append("file", createMockFile("a.jpg", 100, "image/jpeg"));

    vi.mocked(fetch).mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url?.url ?? "";
      // Check specific upload URL before generic uploadthing check
      if (urlStr === "https://up.uploadthing.com/u1") {
        return new Response("Forbidden", { status: 403 });
      }
      if (urlStr.includes("uploadthing")) {
        return new Response(JSON.stringify([{ key: "k1", url: "https://up.uploadthing.com/u1" }]), { status: 200 });
      }
      return new Response(null, { status: 404 });
    });

    const res = await POST(makeReq(form, "http://localhost:3000"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("403");
  });

  it("returns 500 for unexpected errors", async () => {
    const req = new NextRequest(
      new Request("http://localhost:3000/api/upload", {
        method: "POST",
        headers: { origin: "http://localhost:3000" },
        body: new ReadableStream({
          start(ctrl) { ctrl.enqueue(new TextEncoder().encode("not-form")); ctrl.close(); },
        }),
        duplex: "half",
      } as RequestInit & { duplex: string }),
    );

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
