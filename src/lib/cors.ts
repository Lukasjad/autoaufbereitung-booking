import { NextResponse } from "next/server";

export function addCors(res: NextResponse, origin: string): NextResponse {
  if (origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, PATCH");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.headers.set("Access-Control-Max-Age", "86400");
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
