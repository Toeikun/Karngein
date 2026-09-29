"use client";

/**
 * useAuth — สถานะการเข้าสู่ระบบ
 * - disabled : ไม่ได้ตั้งค่า Firebase → ใช้แบบ Guest อย่างเดียว
 * - loading  : กำลังตรวจว่าเคยล็อกอินค้างไว้ไหม
 * - signedOut / signedIn
 */
import { useCallback, useEffect, useState } from "react";
import type { AuthService, AuthUser } from "@/application/ports/AuthService";

export type AuthState =
  | { status: "disabled" | "loading" | "signedOut"; user: null }
  | { status: "signedIn"; user: AuthUser };

export function useAuth(auth: AuthService | null) {
  const [state, setState] = useState<AuthState>({ status: auth ? "loading" : "disabled", user: null });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    return auth.onChange((user) => setState(user ? { status: "signedIn", user } : { status: "signedOut", user: null }));
  }, [auth]);

  const signIn = useCallback(async () => {
    if (!auth) return;
    setError(null);
    const result = await auth.signIn();
    if (!result.ok) setError(result.message);
  }, [auth]);

  const signOut = useCallback(async () => {
    await auth?.signOut();
  }, [auth]);

  return { ...state, error, signIn, signOut };
}
