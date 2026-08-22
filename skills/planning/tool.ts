import type { SkillModule } from "@/lib/skills/types"
import { createStoredPlan, createTask, listPlans, listTasks } from "@/lib/db/store"

export const planningSkill: SkillModule = {
  id: "planning",
  label: "Planning",
  description: "Goals, tasks, and continuable plans. Offline.",
  offline: true,
  network: false,
  permission: "automatic",
  tools: ["mind"],
}

export { createStoredPlan, createTask, listPlans, listTasks }
