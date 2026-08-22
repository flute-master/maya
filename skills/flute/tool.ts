import type { SkillModule } from "@/lib/skills/types"

export const fluteSkill: SkillModule = {
  id: "flute",
  label: "Flute",
  description: "Teaching tunes and clip pitch. Offline. No film scores.",
  offline: true,
  network: false,
  permission: "automatic",
  tools: ["flute"],
}
