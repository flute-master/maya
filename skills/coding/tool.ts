import type { SkillModule } from "@/lib/skills/types"

export const codingSkill: SkillModule = {
  id: "coding",
  label: "Coding",
  description: "Inspect workspace files. Shell is disabled.",
  offline: true,
  network: false,
  permission: "disabled",
  tools: ["shell"],
}
