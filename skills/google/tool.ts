import type { SkillModule } from "@/lib/skills/types"

export const googleSkill: SkillModule = {
  id: "google",
  label: "Google",
  description: "Calendar, Gmail, Drive. OAuth. Gmail send always asks.",
  offline: false,
  network: true,
  permission: "ask",
  tools: [
    "google_calendar",
    "google_gmail",
    "google_drive",
    "google_docs",
    "google_sheets",
    "google_tasks",
    "google_people",
  ],
}
