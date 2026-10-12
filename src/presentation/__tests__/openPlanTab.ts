import { fireEvent, screen } from "@testing-library/react";

/**
 * แอปเปิดมาที่แท็บ "รายการ" (Phase 12.1b) — เทสต์ที่ทำงานกับแผนต้องกดแท็บ "วางแผน" ก่อน
 * รอจนแผนโหลดเสร็จ (แท็บโผล่) → กด → รอหัวข้อ "แหล่งรายได้"
 */
export async function openPlanTab() {
  fireEvent.click(await screen.findByRole("tab", { name: "วางแผน" }));
  await screen.findByRole("heading", { name: "แหล่งรายได้" });
}
