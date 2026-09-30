"use client";

/**
 * KarngeinApp — เลือกว่าจะทำงานกับข้อมูลที่ไหน ตามสถานะการเข้าสู่ระบบ
 *
 *   ยังไม่ล็อกอิน → PlanWorkspace + ที่เก็บในเครื่อง (Guest)
 *   ล็อกอินแล้ว   → (ถามย้ายแผนในเครื่องขึ้นคลาวด์) → PlanWorkspace + Firestore ของผู้ใช้
 *
 * ใช้ `key` บังคับให้ PlanWorkspace สร้างใหม่เมื่อสลับผู้ใช้ → state เก่าไม่ปนกับของบัญชีใหม่
 */
import { useEffect, useState } from "react";
import type { AuthService } from "@/application/ports/AuthService";
import type { PlanRepository } from "@/application/ports/PlanRepository";
import { findGuestPlansToMigrate, migrateGuestPlans } from "@/application/usecases/migrateGuestPlans";
import { getAuthService, getCloudPlanRepository, getPlanRepository } from "@/di/container";
import { useAuth } from "../hooks/useAuth";
import { useIsClient } from "../hooks/useIsClient";
import type { UsePlanOptions } from "../hooks/usePlan";
import { AccountMenu } from "./layout/AccountMenu";
import { LoadingState } from "./ui/LoadingState";
import { Header } from "./layout/Header";
import { PlanWorkspace } from "./PlanWorkspace";

export interface KarngeinAppProps extends UsePlanOptions {
  /** ระบบล็อกอิน — ไม่ส่ง = ใช้จาก di, null = ปิดการล็อกอิน */
  auth?: AuthService | null;
  cloudRepository?: (uid: string) => PlanRepository;
}

export function KarngeinApp({ auth: authProp, cloudRepository = getCloudPlanRepository, repository, ...options }: KarngeinAppProps) {
  const isClient = useIsClient();
  const [authService] = useState(() => (authProp === undefined ? getAuthService() : authProp));
  const [guestRepository] = useState(() => repository ?? getPlanRepository());
  const auth = useAuth(authService);
  const uid = auth.status === "signedIn" ? auth.user.uid : null;
  const [cloud, setCloud] = useState<{ uid: string; repository: PlanRepository } | null>(null);

  // ล็อกอินแล้ว → ถามย้ายแผนในเครื่อง (ถ้ามี) → เปิดข้อมูลบนคลาวด์
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      const cloudRepo = cloudRepository(uid);
      try {
        const toMigrate = await findGuestPlansToMigrate(guestRepository, cloudRepo);
        if (
          !cancelled &&
          toMigrate.length > 0 &&
          window.confirm(`พบแผนในเครื่องนี้ ${toMigrate.length} แผน ต้องการย้ายขึ้นบัญชี Google เพื่อใช้ได้ทุกเครื่องไหม?\n(ข้อมูลในเครื่องยังอยู่ ไม่ถูกลบ)`)
        ) {
          await migrateGuestPlans(toMigrate, cloudRepo);
        }
      } catch (error) {
        console.error("[Karngein] ย้ายแผนขึ้นคลาวด์ไม่สำเร็จ", error);
      }
      if (!cancelled) setCloud({ uid, repository: cloudRepo });
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, cloudRepository, guestRepository]);

  const account = (
    <AccountMenu status={auth.status} user={auth.user} error={auth.error} onSignIn={auth.signIn} onSignOut={auth.signOut} />
  );

  let content;
  if (!isClient) {
    // ตอน build และตอน hydrate ครั้งแรก: หน้าตาเหมือนกันทุกครั้ง (ไม่ขึ้นกับ localStorage / สถานะล็อกอิน)
    content = (
      <>
        <Header status="loading" />
        <LoadingState message="กำลังโหลด…" stage="เริ่มแอป" />
      </>
    );
  } else if (auth.status === "loading" || (uid && cloud?.uid !== uid)) {
    content = (
      <>
        <Header status="loading" account={account} />
        {uid ? (
          <LoadingState message="กำลังเตรียมข้อมูลบนคลาวด์…" stage="เตรียมข้อมูลบนคลาวด์" />
        ) : (
          <LoadingState message="กำลังโหลด…" stage="ตรวจสอบบัญชี" />
        )}
      </>
    );
  } else if (uid && cloud) {
    content = <PlanWorkspace key={uid} mode="cloud" repository={cloud.repository} account={account} {...options} />;
  } else {
    content = <PlanWorkspace key="guest" mode="guest" repository={guestRepository} account={account} {...options} />;
  }

  return <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:py-8">{content}</div>;
}
