import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingState, SLOW_AFTER_MS } from "@/presentation/components/ui/LoadingState";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("LoadingState — ไม่ปล่อยให้ค้างหน้า 'กำลังโหลด'", () => {
  it("ช่วงแรกแสดงแค่ข้อความกำลังโหลด", () => {
    render(<LoadingState message="กำลังโหลดแผน…" stage="โหลดแผนจากคลาวด์" />);
    expect(screen.getByText("กำลังโหลดแผน…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "โหลดใหม่" })).not.toBeInTheDocument();
  });

  it("นานเกิน 10 วินาที → แสดงคำอธิบาย + ปุ่มโหลดใหม่ + ขั้นตอนที่ค้าง", () => {
    render(<LoadingState message="กำลังโหลดแผน…" stage="โหลดแผนจากคลาวด์" />);
    act(() => vi.advanceTimersByTime(SLOW_AFTER_MS));
    expect(screen.getByRole("alert")).toHaveTextContent("ใช้เวลานานกว่าปกติ");
    expect(screen.getByRole("button", { name: "โหลดใหม่" })).toBeInTheDocument();
    expect(screen.getByText("ขั้นตอน: โหลดแผนจากคลาวด์")).toBeInTheDocument();
  });
});
