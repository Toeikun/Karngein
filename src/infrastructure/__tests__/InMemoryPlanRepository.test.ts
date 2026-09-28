import { InMemoryPlanRepository } from "@/infrastructure/storage/InMemoryPlanRepository";
import { describePlanRepositoryContract } from "./planRepository.contract";

describePlanRepositoryContract("InMemoryPlanRepository", () => new InMemoryPlanRepository());
