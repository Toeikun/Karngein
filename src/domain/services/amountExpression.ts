/**
 * amountExpression — คิดเลขในช่องจำนวนเงิน (แป้นตัวเลขบวกลบคูณหารได้ — Phase 12.1)
 *
 * รองรับ: ตัวเลข (มีคอมมา/ทศนิยมได้), + − × ÷ (หรือ - * x /), ช่องว่าง
 * คูณ/หารก่อนบวก/ลบ เช่น "120+35×2" = 190
 * ไม่ใช้ eval() — แยกตัวเลข/เครื่องหมายเอง จึงปลอดภัยจากการแทรกโค้ด
 */
import { round2 } from "../entities/Money";

export type AmountResult = { ok: true; value: number; isExpression: boolean } | { ok: false; message: string };

const OPERATOR_ALIASES: Record<string, string> = { "+": "+", "-": "-", "−": "-", "*": "*", "×": "*", x: "*", X: "*", "/": "/", "÷": "/" };

export function evaluateAmount(text: string): AmountResult {
  const cleaned = text.replace(/[,\s฿]/g, "");
  if (cleaned === "") return { ok: false, message: "กรุณาใส่จำนวนเงิน" };

  // แยกเป็น [ตัวเลข, เครื่องหมาย, ตัวเลข, ...]
  const tokens = cleaned.match(/\d+(?:\.\d+)?|\.\d+|[+\-−*×xX/÷]|./g) ?? [];
  const numbers: number[] = [];
  const operators: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const expectNumber = i % 2 === 0;
    if (expectNumber) {
      if (!/^(\d+(\.\d+)?|\.\d+)$/.test(token)) return { ok: false, message: "ใส่ได้เฉพาะตัวเลขและ + − × ÷" };
      numbers.push(Number(token));
    } else {
      const op = OPERATOR_ALIASES[token];
      if (!op) return { ok: false, message: "ใส่ได้เฉพาะตัวเลขและ + − × ÷" };
      operators.push(op);
    }
  }
  if (numbers.length === operators.length) return { ok: false, message: "สูตรยังไม่จบ (ลงท้ายด้วยเครื่องหมาย)" };

  // รอบแรก: คูณ/หาร
  const terms = [numbers[0]];
  const addOps: string[] = [];
  for (let i = 0; i < operators.length; i++) {
    const op = operators[i];
    const next = numbers[i + 1];
    if (op === "*") terms[terms.length - 1] *= next;
    else if (op === "/") {
      if (next === 0) return { ok: false, message: "หารด้วยศูนย์ไม่ได้" };
      terms[terms.length - 1] /= next;
    } else {
      terms.push(next);
      addOps.push(op);
    }
  }
  // รอบสอง: บวก/ลบ
  let value = terms[0];
  addOps.forEach((op, i) => {
    value = op === "+" ? value + terms[i + 1] : value - terms[i + 1];
  });

  value = round2(value);
  if (value <= 0) return { ok: false, message: "ผลลัพธ์ต้องมากกว่า 0" };
  return { ok: true, value, isExpression: operators.length > 0 };
}
