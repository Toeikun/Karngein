import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "../page";

// CP-0: ยืนยันว่า React Testing Library ตั้งค่าถูกต้อง render หน้าแรกได้
describe("หน้าแรก", () => {
  it("แสดงชื่อแอป Karngein", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Karngein" })).toBeInTheDocument();
  });
});
