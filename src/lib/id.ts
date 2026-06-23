export function generateLinkId(): string {
  return crypto.randomUUID().slice(0, 8);
}
