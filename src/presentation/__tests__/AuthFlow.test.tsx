import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthService, AuthUser, SignInResult } from "@/application/ports/AuthService";
import { InMemoryActivePlanStore } from "@/infrastructure/storage/LocalStorageActivePlanStore";
import { InMemoryPlanRepository } from "@/infrastructure/storage/InMemoryPlanRepository";
import { KarngeinApp } from "@/presentation/components/KarngeinApp";
import { createTestContext } from "../../application/__tests__/testContext";
import { goldenPlan1 } from "../../domain/__tests__/goldenData";

/** ระบบล็อกอินปลอม — ควบคุมได้จากเทสต์ (ไม่ต่อ Firebase จริง) */
class FakeAuthService implements AuthService {
  private listeners = new Set<(user: AuthUser | null) => void>();
  private user: AuthUser | null = null;
  nextSignIn: SignInResult = { ok: true };
  hint = false;

  probablySignedIn() {
    return this.hint;
  }

  onChange(callback: (user: AuthUser | null) => void) {
    this.listeners.add(callback);
    queueMicrotask(() => callback(this.user)); // แบบ Firebase: แจ้งสถานะปัจจุบันทันทีหลังสมัครรับ
    return () => this.listeners.delete(callback);
  }
  async signIn() {
    if (this.nextSignIn.ok) this.emit({ uid: "alice", displayName: "Alice", email: "alice@example.com" });
    return this.nextSignIn;
  }
  async signOut() {
    this.emit(null);
  }
  emit(user: AuthUser | null) {
    this.user = user;
    act(() => this.listeners.forEach((listener) => listener(user)));
  }
}

/** คลาวด์ที่ปฏิเสธทุกคำขอ (จำลอง Firestore Rules ที่ไม่อนุญาต) */
class DeniedRepository extends InMemoryPlanRepository {
  override async list(): Promise<never> {
    throw new Error("ไม่มีสิทธิ์เข้าถึงข้อมูลบนคลาวด์ — ตรวจ Firestore Rules");
  }
}

async function setup({ guestPlan = true, denied = false } = {}) {
  const auth = new FakeAuthService();
  const guest = new InMemoryPlanRepository();
  if (guestPlan) await guest.save(goldenPlan1);
  const clouds = new Map<string, InMemoryPlanRepository>();
  const cloudRepository = (uid: string) => {
    if (!clouds.has(uid)) clouds.set(uid, denied ? new DeniedRepository() : new InMemoryPlanRepository());
    return clouds.get(uid)!;
  };
  const user = userEvent.setup();
  render(
    <KarngeinApp
      auth={auth}
      repository={guest}
      cloudRepository={cloudRepository}
      activePlanStore={new InMemoryActivePlanStore()}
      ctx={createTestContext()}
    />,
  );
  await screen.findByRole("heading", { name: "แหล่งรายได้" });
  return { auth, guest, cloudRepository, user };
}

const card = (name: string) => screen.getByRole("status", { name });
const signInButton = () => screen.getByRole("button", { name: /เข้าสู่ระบบ/ });

beforeEach(() => vi.spyOn(window, "confirm").mockReturnValue(true));
afterEach(() => vi.restoreAllMocks());

describe("CP-8: เข้าสู่ระบบ + ย้ายแผนขึ้นคลาวด์", () => {
  it("ยังไม่ล็อกอิน → มีปุ่มเข้าสู่ระบบ และใช้ข้อมูลในเครื่อง", async () => {
    await setup();
    expect(signInButton()).toBeInTheDocument();
    expect(card("รายได้รวม")).toHaveTextContent("฿34,166.67");
  });

  it("ล็อกอิน → ถามย้ายแผน → ตอบย้าย → แผนขึ้นคลาวด์ และหน้าจอแสดงข้อมูลจากคลาวด์", async () => {
    const { user, cloudRepository } = await setup();
    await user.click(signInButton());
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("พบแผนในเครื่องนี้ 1 แผน"));
    await screen.findByRole("button", { name: /บัญชี Alice/ });
    await waitFor(() => expect(card("รายได้รวม")).toHaveTextContent("฿34,166.67"));
    expect((await cloudRepository("alice").get(goldenPlan1.id))?.name).toBe(goldenPlan1.name);
  });

  it("ตอบไม่ย้าย → คลาวด์ได้แผนใหม่ว่าง แผนในเครื่องยังอยู่", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const { user, cloudRepository, guest } = await setup();
    await user.click(signInButton());
    await screen.findByRole("button", { name: /บัญชี Alice/ });
    await waitFor(() => expect(card("รายได้รวม")).toHaveTextContent("฿0.00"));
    expect(await cloudRepository("alice").get(goldenPlan1.id)).toBeNull();
    expect(await guest.get(goldenPlan1.id)).not.toBeNull();
  });

  it("ไม่มีแผนในเครื่อง → ไม่ถามย้าย", async () => {
    const { user } = await setup({ guestPlan: false });
    await user.click(signInButton());
    await screen.findByRole("button", { name: /บัญชี Alice/ });
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("ออกจากระบบ → กลับมาใช้ข้อมูลในเครื่อง ไม่เห็นข้อมูลคลาวด์", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const { user } = await setup();
    await user.click(signInButton());
    await user.click(await screen.findByRole("button", { name: /บัญชี Alice/ }));
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ออกจากระบบ" }));
    await waitFor(() => expect(signInButton()).toBeInTheDocument());
    await waitFor(() => expect(card("รายได้รวม")).toHaveTextContent("฿34,166.67"));
  });

  it("คลาวด์ปฏิเสธสิทธิ์ → แสดงข้อความ error ไม่ค้างหน้า 'กำลังโหลด'", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { user } = await setup({ denied: true });
    await user.click(signInButton());
    expect(await screen.findByText("โหลดแผนไม่สำเร็จ")).toBeInTheDocument();
    expect(screen.getByText(/ตรวจ Firestore Rules/)).toBeInTheDocument();
    expect(screen.queryByText(/กำลังโหลดแผน/)).not.toBeInTheDocument();
  });

  it("ล็อกอินไม่สำเร็จ → แสดงข้อความ error ภาษาไทย", async () => {
    const { user, auth } = await setup();
    auth.nextSignIn = { ok: false, message: "เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ" };
    await user.click(signInButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ");
  });

  it("ครั้งก่อนล็อกอินอยู่ (hint) → รอยืนยันก่อน ไม่แสดงข้อมูลในเครื่องชั่วคราว", async () => {
    const auth = new FakeAuthService();
    auth.hint = true;
    const guest = new InMemoryPlanRepository();
    await guest.save(goldenPlan1);
    render(<KarngeinApp auth={auth} repository={guest} cloudRepository={() => new InMemoryPlanRepository()} activePlanStore={new InMemoryActivePlanStore()} ctx={createTestContext()} />);
    expect(screen.getAllByText("กำลังโหลด…").length).toBeGreaterThan(0);
    expect(screen.queryByRole("status", { name: "รายได้รวม" })).not.toBeInTheDocument();
    auth.emit({ uid: "alice", displayName: "Alice", email: "a@x.com" });
    await screen.findByRole("button", { name: /บัญชี Alice/ });
    expect(screen.queryByText("฿34,166.67")).not.toBeInTheDocument(); // ไม่เคยแสดงข้อมูล guest
  });

  it("ไม่ได้ตั้งค่า Firebase (auth = null) → ไม่มีปุ่มเข้าสู่ระบบ ใช้แบบ Guest ได้ปกติ", async () => {
    const guest = new InMemoryPlanRepository();
    await guest.save(goldenPlan1);
    render(<KarngeinApp auth={null} repository={guest} activePlanStore={new InMemoryActivePlanStore()} ctx={createTestContext()} />);
    await screen.findByRole("heading", { name: "แหล่งรายได้" });
    expect(screen.queryByRole("button", { name: /เข้าสู่ระบบ/ })).not.toBeInTheDocument();
  });
});
