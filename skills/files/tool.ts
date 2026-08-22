import type { SkillModule } from "@/lib/skills/types"

export const filesSkill: SkillModule = {
  id: "files",
  label: "Files",
  description: "Sandbox only: data/workspace. Path traversal is rejected.",
  offline: true,
  network: false,
  permission: "ask",
  tools: ["files_list", "files_read", "files_write"],
}
