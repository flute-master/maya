import { spawn } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.cwd()
export const BRAIN_STATUS = join(ROOT, "data", "brain-status.json")

export type BrainInstallStatus = {
  running: boolean
  step?: string
  error?: string | null
  updatedAt?: number
}

function writeStatus(partial: BrainInstallStatus) {
  mkdirSync(join(ROOT, "data"), { recursive: true })
  writeFileSync(
    BRAIN_STATUS,
    JSON.stringify({ ...partial, updatedAt: Date.now() }, null, 2),
    "utf8"
  )
}

export function readBrainInstall(): BrainInstallStatus {
  try {
    const data = JSON.parse(readFileSync(BRAIN_STATUS, "utf8")) as BrainInstallStatus
    const updatedAt = data.updatedAt ?? 0
    const stale = Boolean(data.running) && updatedAt > 0 && Date.now() - updatedAt > 30 * 60_000
    if (stale) {
      return {
        running: false,
        error: "Install stopped updating. Run npm run brain in a terminal.",
        updatedAt,
      }
    }
    return data
  } catch {
    return { running: false, error: null }
  }
}

export function startBrainInstall(base = "llama3.2"): { ok: true; pid: number } | { ok: false; error: string } {
  const current = readBrainInstall()
  if (current.running) {
    return { ok: false, error: "A download is already running." }
  }
  writeStatus({ running: true, step: `Pulling ${base}…`, error: null })

  const child = spawn("ollama", ["pull", base], {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  })

  if (!child.pid) {
    writeStatus({
      running: false,
      error: "Could not start ollama. Install it from https://ollama.com then run npm run brain.",
    })
    return {
      ok: false,
      error: "Could not start ollama. Install https://ollama.com, then npm run brain.",
    }
  }

  child.stderr?.on("data", (buf: Buffer) => {
    const line = buf.toString("utf8").trim().split("\n").at(-1)
    if (line) writeStatus({ running: true, step: line.slice(0, 180), error: null })
  })

  child.on("error", () => {
    writeStatus({
      running: false,
      error: "ollama is not on PATH. Install https://ollama.com then run npm run brain.",
    })
  })

  child.on("close", (code) => {
    if (code !== 0) {
      writeStatus({
        running: false,
        error: `ollama pull failed (${code}). Check that Ollama is running, then try again.`,
      })
      return
    }
    writeStatus({ running: true, step: "Baking model maya from Modelfile…", error: null })
    const create = spawn("ollama", ["create", "maya", "-f", "Modelfile"], {
      cwd: ROOT,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    })
    create.on("error", () => {
      writeStatus({
        running: false,
        error: "ollama create failed. From the project folder: ollama create maya -f Modelfile",
      })
    })
    create.on("close", (createCode) => {
      if (createCode !== 0) {
        writeStatus({
          running: false,
          error: "Could not create maya. Run: ollama create maya -f Modelfile",
        })
        return
      }
      writeStatus({
        running: false,
        step: "maya is ready. Restart npm run dev if she was already open.",
        error: null,
      })
    })
    create.unref()
  })

  child.unref()
  return { ok: true, pid: child.pid }
}
