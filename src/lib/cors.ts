import { NextResponse } from "next/server";

function setCorsHeaders(res: NextResponse, origin: string): void {
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, PATCH");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Max-Age", "86400");
  res.headers.set("Vary", "Origin");
}

export function addCors(res: NextResponse, origin: string): NextResponse {
  if (origin) setCorsHeaders(res, origin);
  return res;
}

/**
 * Wie addCors, aber validiert den Origin-Header gegen die eigene Domain.
 * Verhindert Cross-Origin-Zugriffe auf Admin-Endpunkte.
 */
export function addCorsStrict(res: NextResponse, request: Request): NextResponse {
  const reqOrigin = request.headers.get("origin");
  const host = request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto") || "https";

  if (reqOrigin) {
    const expectedOrigin = `${proto}://${host}`;
    // Erlaubt auch localhost für Entwicklung
    const isLocalhost = host === "localhost:3000" || host === "127.0.0.1:3000";
    const isExpected = reqOrigin === expectedOrigin || reqOrigin === `https://${host}`;

    if (isExpected || isLocalhost) {
      setCorsHeaders(res, reqOrigin);
    }
    // Bei nicht-übereinstimmendem Origin keine CORS-Header setzen → Browser blockiert
  } else {
    // Kein Origin-Header → same-origin request (keine CORS nötig)
  }
  return res;
}

export function corsResponse(origin: string, status = 204): NextResponse {
  const res = new NextResponse(null, { status });
  return addCors(res, origin);
}

export function getOrigin(request: Request): string {
  const host = request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}
