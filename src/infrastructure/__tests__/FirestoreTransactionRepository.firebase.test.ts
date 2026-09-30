import { afterAll, beforeEach } from "vitest";
import { FirestoreTransactionRepository } from "@/infrastructure/firebase/FirestoreTransactionRepository";
import { clearFirestore, closeAllApps, firestoreAs } from "./emulator";
import { describeTransactionRepositoryContract } from "./transactionRepository.contract";

beforeEach(clearFirestore);
afterAll(closeAllApps);

// ชุดเทสต์กลางชุดเดียวกับ InMemory และ LocalStorage (รันบน GitHub Actions — ต้องใช้ Java)
describeTransactionRepositoryContract("FirestoreTransactionRepository (Emulator)", async () => {
  await clearFirestore();
  return new FirestoreTransactionRepository(firestoreAs("alice"), "alice");
});
