import { describe, expect, it } from "vitest";

// CP-0: เทสต์ตัวอย่าง ยืนยันว่า Vitest รันได้
describe("sanity", () => {
  it("1 + 1 = 2", () => {
    expect(1 + 1).toBe(2);
  });
});
