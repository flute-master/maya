import type { SkillModule } from "@/lib/skills/types"
import { codingSkill } from "@/skills/coding/tool"
import { filesSkill } from "@/skills/files/tool"
import { fluteSkill } from "@/skills/flute/tool"
import { googleSkill } from "@/skills/google/tool"
import { memorySkill } from "@/skills/memory/tool"
import { planningSkill } from "@/skills/planning/tool"
import { pythonSkill } from "@/skills/python/tool"
import { visionSkill } from "@/skills/vision/tool"
import { weatherSkill } from "@/skills/weather/tool"
import { webSkill } from "@/skills/web/tool"

const SKILLS: SkillModule[] = [
  memorySkill,
  planningSkill,
  weatherSkill,
  webSkill,
  filesSkill,
  pythonSkill,
  fluteSkill,
  googleSkill,
  visionSkill,
  codingSkill,
]

export function listSkills() {
  return SKILLS
}

export function getSkill(id: string) {
  return SKILLS.find((skill) => skill.id === id) || null
}
