import type { SkillModule } from "@/lib/skills/types"

export const webSkill: SkillModule = {
  id: "web",
  label: "Web",
  description: "Lookup, news, maps, music, official otaku links",
  offline: false,
  network: true,
  permission: "automatic",
  tools: ["lookup", "news", "maps", "music", "otaku", "fetch_page"],
}
