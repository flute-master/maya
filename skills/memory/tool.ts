import { searchMemories, saveMemory, forgetMemory } from "@/lib/db/store"
import type { SkillModule } from "@/lib/skills/types"
import type { MemorySaveArgs } from "@/skills/memory/types"

export const memorySkill: SkillModule = {
  id: "memory",
  label: "Memory",
  description: "Local SQLite facts with confidence. Works offline.",
  offline: true,
  network: false,
  permission: "automatic",
  tools: ["recall", "mind"],
}

export function memorySearch(query: string, limit?: number) {
  return searchMemories(query, limit)
}

export function memorySave(args: MemorySaveArgs) {
  return saveMemory(args)
}

export function memoryForget(id: string) {
  return forgetMemory(id)
}
