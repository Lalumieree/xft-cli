import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultMenuFile } from "./constants";

describe("shared constants", () => {
  it("resolves the bundled or source menu file path", () => {
    expect(existsSync(defaultMenuFile)).toBe(true);
  });
});
