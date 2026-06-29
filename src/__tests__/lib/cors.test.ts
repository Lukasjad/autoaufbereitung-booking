import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";
import { addCors, addCorsStrict, corsResponse, getOrigin } from "@/lib/cors";

describe("addCors", () => {
  it("sets CORS headers for valid origin", () => {
    const res = NextResponse.json({});
    addCors(res, "http://localhost:3000");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, DELETE, PATCH");
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type, Authorization");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  it("does not set headers for empty origin", () => {
    const res = NextResponse.json({});
    addCors(res, "");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("addCorsStrict", () => {
  it("allows same-origin request", () => {
    const res = NextResponse.json({});
    const req = new Request("https://example.com", {
      headers: { origin: "https://example.com", host: "example.com" },
    });
    addCorsStrict(res, req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://example.com");
  });

  it("allows localhost from 127.0.0.1", () => {
    const res = NextResponse.json({});
    const req = new Request("http://127.0.0.1:3000", {
      headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" },
    });
    addCorsStrict(res, req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://127.0.0.1:3000");
  });

  it("rejects external domain", () => {
    const res = NextResponse.json({});
    const req = new Request("http://example.com", {
      headers: { origin: "https://evil.com", host: "example.com" },
    });
    addCorsStrict(res, req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("handles request without origin header", () => {
    const res = NextResponse.json({});
    const req = new Request("http://localhost:3000", { headers: { host: "localhost:3000" } });
    addCorsStrict(res, req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("allows localhost from any origin when host is localhost:3000", () => {
    const res = NextResponse.json({});
    const req = new Request("http://localhost:3000", {
      headers: { origin: "https://evil.com", host: "localhost:3000" },
    });
    addCorsStrict(res, req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://evil.com");
  });
});

describe("corsResponse", () => {
  it("returns response with CORS headers", () => {
    const res = corsResponse("http://example.com", 200);
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://example.com");
  });

  it("defaults to 204 status", () => {
    const res = corsResponse("");
    expect(res.status).toBe(204);
  });
});

describe("getOrigin", () => {
  it("constructs origin from host and proto", () => {
    const req = new Request("https://example.com/api", {
      headers: { host: "example.com", "x-forwarded-proto": "https" },
    });
    expect(getOrigin(req)).toBe("https://example.com");
  });

  it("defaults to http when no proto header", () => {
    const req = new Request("http://example.com", {
      headers: { host: "example.com" },
    });
    expect(getOrigin(req)).toBe("http://example.com");
  });
});
