import type { SkillModule } from "@/lib/skills/types"

export const visionSkill: SkillModule = {
  id: "vision",
  label: "Vision",
  description: "Stores a screen still. Cannot see pixels without a local vision model.",
  offline: true,
  network: false,
  permission: "ask",
  tools: ["observe"],
}
