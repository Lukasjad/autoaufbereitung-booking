export function sanitize(v: string): string {
  return v.replace(/<[^>]*>/g, "").trim();
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
