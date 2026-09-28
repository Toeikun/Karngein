import type { FlowNode } from "@/domain/services/buildFlowGraph";
import { CATEGORY_STYLES } from "../../styles/categoryStyles";

/** สีของโหนดใน Sankey — หมวด/กลุ่ม/รายการย่อยใช้สีตามหมวด */
export function nodeColor(node: FlowNode): string {
  if (node.category) return CATEGORY_STYLES[node.category].hex;
  switch (node.kind) {
    case "income":
      return "#6366f1"; // indigo-500
    case "pool":
      return "#334155"; // slate-700
    case "deficit":
      return "#ef4444"; // red-500
    default:
      return "#94a3b8"; // slate-400 (เงินคงเหลือ)
  }
}
