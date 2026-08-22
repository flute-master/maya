import { access, stat } from "node:fs/promises"
import { join } from "node:path"

import { getDb, MAYA_DB_PATH } from "@/lib/db/store"
import { ollamaReady } from "@/lib/ollama"
import { WORKSPACE } from "@/lib/sage/files"
import { listSkills } from "@/lib/skills/registry"

export type DoctorCheck = {
  name: string
  ok: boolean
  warn?: boolean
  detail: string
  offline: boolean
}

async function exists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function runDoctor(): Promise<{
  checks: DoctorCheck[]
  healthy: number
  warning: number
  error: number
}> {
  const checks: DoctorCheck[] = []
  const add = (check: DoctorCheck) => checks.push(check)

  add({
    name: "Node.js",
    ok: true,
    detail: process.version,
    offline: true,
  })

  try {
    getDb()
    add({
      name: "SQLite",
      ok: true,
      detail: `data/maya.db ready (${MAYA_DB_PATH.endsWith("maya.db") ? "local file" : "open"})`,
      offline: true,
    })
  } catch (caught) {
    add({
      name: "SQLite",
      ok: false,
      detail: caught instanceof Error ? caught.message : "Could not open data/maya.db",
      offline: true,
    })
  }

  const vault = join(process.cwd(), "data", "maya-memory.json")
  add({
    name: "Vault",
    ok: true,
    warn: !(await exists(vault)),
    detail: (await exists(vault))
      ? "data/maya-memory.json present"
      : "No vault file yet — first save creates it",
    offline: true,
  })

  const knowledge = join(process.cwd(), "data", "knowledge")
  add({
    name: "Knowledge",
    ok: true,
    warn: !(await exists(join(knowledge, ".gitkeep"))) && !(await exists(knowledge)),
    detail: "data/knowledge — drop notes here. Search is local text, not embeddings.",
    offline: true,
  })

  try {
    const info = await stat(WORKSPACE)
    add({
      name: "Workspace",
      ok: info.isDirectory(),
      detail: "data/workspace sandbox",
      offline: true,
    })
  } catch {
    add({
      name: "Workspace",
      ok: false,
      detail: "data/workspace missing",
      offline: true,
    })
  }

  const skills = listSkills()
  add({
    name: "Skills",
    ok: skills.length >= 8,
    detail: `${skills.length} registered. Offline: ${skills.filter((s) => s.offline).length}`,
    offline: true,
  })

  let python = false
  try {
    const { spawn } = await import("node:child_process")
    python = await new Promise((resolve) => {
      const child = spawn("python3", ["-c", "print(1)"], { stdio: "ignore" })
      child.on("error", () => resolve(false))
      child.on("close", (code) => resolve(code === 0))
    })
  } catch {
    python = false
  }
  add({
    name: "Python",
    ok: python,
    detail: python ? "python3 on PATH (sandbox uses -I)" : "python3 not found — calc and Mind still work",
    offline: true,
  })

  const model = await ollamaReady()
  add({
    name: "Ollama",
    ok: true,
    warn: !model,
    detail: model
      ? `Local model: ${model}`
      : "Ollama down. Built-in engine + offline skills still answer.",
    offline: true,
  })

  const google = await exists(join(process.cwd(), "data", "google-oauth.json")).catch(() => false)
  const saFile = await exists(join(process.cwd(), "data", "google-service-account.json"))
  const { readServiceAccount } = await import("@/lib/google/auth")
  const sa = saFile || Boolean(await readServiceAccount())
  add({
    name: "Google",
    ok: true,
    warn: !google && !sa,
    detail:
      google || sa
        ? "Credentials on disk (not printed). Gmail still needs OAuth."
        : "Not connected. Calendar/Gmail stay honest about that.",
    offline: true,
  })

  add({
    name: "Vision",
    ok: true,
    warn: true,
    detail: "No local vision model. Stills store pixels only.",
    offline: true,
  })

  const healthy = checks.filter((item) => item.ok && !item.warn).length
  const warning = checks.filter((item) => item.ok && item.warn).length
  const error = checks.filter((item) => !item.ok).length
  return { checks, healthy, warning, error }
}
