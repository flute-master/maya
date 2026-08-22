#!/usr/bin/env node
import { spawn } from "node:child_process"
import { access, mkdir, stat } from "node:fs/promises"
import { createRequire } from "node:module"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"

const root = process.cwd()
const results = []

function add(name, ok, detail, warn = false) {
  results.push({ name, ok, warn, detail })
  const mark = !ok ? "✗" : warn ? "⚠" : "✓"
  console.log(`${mark} ${name} — ${detail}`)
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function main() {
  console.log("MAYA DIAGNOSTICS\n")
  add("Node.js", true, process.version)

  try {
    await mkdir(join(root, "data"), { recursive: true })
    const db = new DatabaseSync(join(root, "data", "maya.db"))
    db.exec("CREATE TABLE IF NOT EXISTS doctor_probe (id TEXT)")
    db.close()
    add("SQLite", true, "data/maya.db")
  } catch (caught) {
    add("SQLite", false, caught instanceof Error ? caught.message : "open failed")
  }

  add(
    "Vault",
    true,
    (await exists(join(root, "data", "maya-memory.json")))
      ? "maya-memory.json present"
      : "no vault yet (ok on a fresh machine)",
    !(await exists(join(root, "data", "maya-memory.json")))
  )

  try {
    const info = await stat(join(root, "data", "workspace"))
    add("Workspace", info.isDirectory(), "data/workspace")
  } catch {
    add("Workspace", false, "data/workspace missing")
  }

  add(
    "Knowledge",
    true,
    "data/knowledge (local notes, no embeddings)",
    !(await exists(join(root, "data", "knowledge")))
  )

  const py = await new Promise((resolve) => {
    const child = spawn("python3", ["-c", "print(1)"], { stdio: "ignore" })
    child.on("error", () => resolve(false))
    child.on("close", (code) => resolve(code === 0))
  })
  add("Python", py, py ? "python3 -I sandbox ready" : "python3 missing — calc still works")

  let ollama = false
  let model = ""
  try {
    const response = await fetch("http://127.0.0.1:11434/api/tags", {
      signal: AbortSignal.timeout(1500),
    })
    if (response.ok) {
      const data = await response.json()
      const names = (data.models || []).map((item) => item.name).filter(Boolean)
      model = names.find((name) => /^maya/i.test(name)) || names[0] || ""
      ollama = Boolean(model)
    }
  } catch {
    ollama = false
  }
  add("Ollama", true, ollama ? `model ${model}` : "down — built-in engine still answers", !ollama)

  add(
    "Google",
    true,
    (await exists(join(root, "data", "google-oauth.json"))) ||
      (await exists(join(root, "data", "google-service-account.json")))
      ? "credentials on disk (not printed)"
      : "not connected",
    !(
      (await exists(join(root, "data", "google-oauth.json"))) ||
      (await exists(join(root, "data", "google-service-account.json")))
    )
  )

  add("Vision", true, "no local vision model — stills only", true)

  add("Voice", true, "hear clips + speechSynthesis / edge-tts if installed")

  try {
    createRequire(import.meta.url)("../package.json")
    add("package.json", true, "Maya app present")
  } catch {
    add("package.json", false, "run from the repo root")
  }

  const healthy = results.filter((item) => item.ok && !item.warn).length
  const warning = results.filter((item) => item.ok && item.warn).length
  const error = results.filter((item) => !item.ok).length
  console.log(`\n${results.length} checks · ${healthy} healthy · ${warning} warning · ${error} error`)
  if (error) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
