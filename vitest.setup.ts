import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// ล้างหน้าจอที่ render ไว้หลังจบแต่ละเทสต์ (ไม่งั้นเทสต์ถัดไปจะเห็นของเก่าซ้อนอยู่)
afterEach(() => cleanup());
