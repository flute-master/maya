import type { SkillModule } from "@/lib/skills/types"
import { runPython } from "@/lib/sage/python"
import type { PythonArgs } from "@/skills/python/types"

export const pythonSkill: SkillModule = {
  id: "python",
  label: "Python",
  description: "data/workspace, 8s, python3 -I. Asks first.",
  offline: true,
  network: false,
  permission: "ask",
  tools: ["python", "calc"],
}

export async function runPythonSkill(args: PythonArgs) {
  return runPython(args.code)
}
