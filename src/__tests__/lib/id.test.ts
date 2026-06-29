import { describe, it, expect } from "vitest";
import { generateLinkId } from "@/lib/id";

describe("generateLinkId", () => {
  it("returns a 16-character string", () => {
    const id = generateLinkId();
    expect(id).toHaveLength(16);
  });

  it("returns hex characters only", () => {
    const id = generateLinkId();
    expect(id).toMatch(/^[0-9a-f]+$/);
  });

  it("generates unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateLinkId()));
    expect(ids.size).toBeGreaterThan(90);
  });
});
