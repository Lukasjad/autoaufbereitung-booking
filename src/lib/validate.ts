export function sanitize(v: string): string {
  return v
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

const ALLOWED_ORIGINS = [
  "autoaufbereitung-booking.vercel.app",
  "localhost:3000",
];

export function validOrigin(origin: string | null): boolean {
  if (!origin) return true; // non-browser requests (curl, server-to-server)
  try {
    const u = new URL(origin);
    return ALLOWED_ORIGINS.some(
      (a) => u.host === a || u.host.endsWith(`.${a}`)
    );
  } catch {
    return false;
  }
}

export function validEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function validPhone(v: string): boolean {
  return /^[+\d][\d\s\-()/]{6,20}$/.test(v);
}

export function validKennzeichen(v: string): boolean {
  return /^[A-ZÄÖÜa-zäöü]{1,3}[- ][A-ZÄÖÜa-zäöü]{1,2}[- ]?\d{1,4}$/.test(v);
}
