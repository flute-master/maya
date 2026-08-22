export type SkillMeta = {
  id: string
  label: string
  description: string
  offline: boolean
  network: boolean
  permission: "automatic" | "ask" | "always_ask" | "disabled"
}

export type SkillModule = SkillMeta & {
  tools: string[]
}
