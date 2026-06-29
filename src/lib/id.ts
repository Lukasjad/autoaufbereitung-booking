export function generateLinkId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}
