/**
 * ทดสอบ firestore.rules — ด่านป้องกันข้อมูลจริงของแอปการเงิน (PLAN.md ข้อ 5.5)
 * Emulator โหลดกฎจาก firestore.rules ตาม firebase.json
 */
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { clearFirestore, closeAllApps, firestoreAs } from "./emulator";

const plan = { id: "p1", name: "แผน", incomes: [], expenses: [], updatedAt: "2027-01-01T00:00:00.000Z" };

/** ต้องถูกปฏิเสธด้วย permission-denied */
async function expectDenied(action: Promise<unknown>) {
  await expect(action).rejects.toMatchObject({ code: "permission-denied" });
}

beforeEach(async () => {
  await clearFirestore();
  // bob มีแผนอยู่ 1 แผน
  await setDoc(doc(firestoreAs("bob"), "users/bob/plans/p1"), plan);
});
afterAll(closeAllApps);

describe("firestore.rules", () => {
  it("ผู้ใช้ A (alice) อ่าน/เขียนแผนตัวเองได้", async () => {
    const db = firestoreAs("alice");
    await setDoc(doc(db, "users/alice/plans/p1"), plan);
    expect((await getDoc(doc(db, "users/alice/plans/p1"))).data()).toEqual(plan);
  });

  it("ผู้ใช้ A (alice) อ่านแผนของ B (bob) ไม่ได้", async () => {
    const db = firestoreAs("alice");
    await expectDenied(getDoc(doc(db, "users/bob/plans/p1")));
    await expectDenied(getDocs(collection(db, "users/bob/plans")));
  });

  it("ผู้ใช้ A (alice) เขียนทับแผนของ B (bob) ไม่ได้", async () => {
    await expectDenied(setDoc(doc(firestoreAs("alice"), "users/bob/plans/p1"), { ...plan, name: "โดนแก้" }));
  });

  it("ไม่ล็อกอิน อ่าน/เขียนไม่ได้", async () => {
    const db = firestoreAs();
    await expectDenied(getDoc(doc(db, "users/bob/plans/p1")));
    await expectDenied(setDoc(doc(db, "users/bob/plans/p2"), plan));
  });

  it("path อื่นนอก users/{uid}/plans ถูกปิดทั้งหมด", async () => {
    await expectDenied(setDoc(doc(firestoreAs("alice"), "users/alice"), { note: "x" }));
    await expectDenied(setDoc(doc(firestoreAs("alice"), "other/doc"), { note: "x" }));
  });
});

describe("firestore.rules — รายการจริง (Phase 11)", () => {
  const tx = { id: "t1", date: "2026-10-01", type: "expense", amount: 250, category: "essential" };

  it("alice อ่าน/เขียนรายการจริงของตัวเองได้", async () => {
    const db = firestoreAs("alice");
    await setDoc(doc(db, "users/alice/plans/p1/transactions/t1"), tx);
    expect((await getDoc(doc(db, "users/alice/plans/p1/transactions/t1"))).data()).toEqual(tx);
  });

  it("alice อ่าน/เขียนรายการจริงของ bob ไม่ได้", async () => {
    await setDoc(doc(firestoreAs("bob"), "users/bob/plans/p1/transactions/t1"), tx);
    const db = firestoreAs("alice");
    await expectDenied(getDocs(collection(db, "users/bob/plans/p1/transactions")));
    await expectDenied(setDoc(doc(db, "users/bob/plans/p1/transactions/t2"), tx));
  });

  it("ไม่ล็อกอิน อ่าน/เขียนรายการจริงไม่ได้", async () => {
    const db = firestoreAs();
    await expectDenied(getDocs(collection(db, "users/bob/plans/p1/transactions")));
    await expectDenied(setDoc(doc(db, "users/bob/plans/p1/transactions/t3"), tx));
  });
});
