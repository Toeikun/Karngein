"use client";

/**
 * AmountKeypad — แป้นตัวเลขในแอป บวกลบคูณหารได้ (ไม่ต้องสลับไปเปิดเครื่องคิดเลข)
 * แค่ต่อข้อความในช่องจำนวนเงิน — การคิดเลขจริงอยู่ใน Domain (evaluateAmount)
 */
interface AmountKeypadProps {
  value: string;
  onChange: (value: string) => void;
}

const KEYS = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", ".", "0", "⌫", "+"];
const OPERATORS = new Set(["÷", "×", "−", "+"]);

export function AmountKeypad({ value, onChange }: AmountKeypadProps) {
  function press(key: string) {
    if (key === "⌫") return onChange(value.slice(0, -1));
    const last = value.slice(-1);
    // กดเครื่องหมายซ้อน → แทนเครื่องหมายเดิม / ขึ้นต้นด้วยเครื่องหมายไม่ได้
    if (OPERATORS.has(key) && (value === "" || OPERATORS.has(last))) {
      return onChange(value === "" ? "" : value.slice(0, -1) + key);
    }
    onChange(value + key);
  }

  return (
    <div role="group" aria-label="แป้นตัวเลข" className="grid grid-cols-4 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          aria-label={key === "⌫" ? "ลบตัวสุดท้าย" : key}
          className={`h-12 rounded-xl text-lg font-semibold transition active:scale-95 ${
            OPERATORS.has(key) ? "bg-indigo-50 text-indigo-700" : key === "⌫" ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-800"
          }`}
        >
          {key}
        </button>
      ))}
      <button type="button" onClick={() => onChange("")} className="col-span-4 h-11 rounded-xl text-sm text-slate-500 hover:bg-slate-100">
        ล้าง
      </button>
    </div>
  );
}
