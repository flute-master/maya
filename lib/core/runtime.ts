import { recentMayaEvents } from "@/lib/core/events"
import { describeBrain } from "@/lib/core/brain"
import {
  countMemories,
  countOpenTasks,
  listAudit,
  listPlans,
  listTasks,
} from "@/lib/db/store"
import { TOOL_POLICIES, offlineSkillIds } from "@/lib/permissions/policies"
import { listSkills } from "@/lib/skills/registry"

export type CoreSnapshot = {
  brain: Awaited<ReturnType<typeof describeBrain>>
  memory: { facts: number }
  tasks: { active: number; sample: string[] }
  plans: { open: number; sample: string[] }
  skills: { total: number; offline: number; names: string[] }
  permissions: Array<{ id: string; label: string; mode: string; offline: boolean }>
  audit: Array<{ at: string; tool: string | null; event: string; allowed: number | null }>
  events: Array<{ type: string; detail?: string; at: number }>
  offline: {
    ready: string[]
    needsNetwork: string[]
  }
}

export async function getCoreSnapshot(): Promise<CoreSnapshot> {
  const brain = await describeBrain()
  const skills = listSkills()
  const tasks = listTasks("active")
  const plans = listPlans().filter((plan) => plan.status === "active")
  return {
    brain,
    memory: { facts: countMemories() },
    tasks: {
      active: countOpenTasks(),
      sample: tasks.slice(0, 5).map((item) => item.title),
    },
    plans: {
      open: plans.length,
      sample: plans.slice(0, 4).map((plan) => plan.title),
    },
    skills: {
      total: skills.length,
      offline: skills.filter((skill) => skill.offline).length,
      names: skills.map((skill) => skill.id),
    },
    permissions: TOOL_POLICIES.filter((item) => item.id !== "shell").map((item) => ({
      id: item.id,
      label: item.label,
      mode: item.mode,
      offline: item.offline,
    })),
    audit: listAudit(12).map((row) => ({
      at: row.created_at,
      tool: row.tool_name,
      event: row.event_type,
      allowed: row.allowed,
    })),
    events: recentMayaEvents(),
    offline: {
      ready: offlineSkillIds(),
      needsNetwork: TOOL_POLICIES.filter((item) => item.network).map((item) => item.id),
    },
  }
}
