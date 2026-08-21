import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { unlink, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { WORKSPACE, ensureWorkspace } from "@/lib/sage/files"

const TIMEOUT_MS = 8000
const MAX_OUT = 4000

export async function runPython(code: string): Promise<{
  ok: boolean
  stdout: string
  stderr: string
}> {
  const trimmed = code.trim()
  if (!trimmed) return { ok: false, stdout: "", stderr: "No Python to run." }
  if (trimmed.length > 12_000) {
    return { ok: false, stdout: "", stderr: "Script is too long." }
  }
  await ensureWorkspace()
  const file = join(WORKSPACE, `.maya-run-${randomBytes(4).toString("hex")}.py`)
  await writeFile(file, trimmed, "utf8")
  try {
    return await new Promise((resolve) => {
      const child = spawn("python3", ["-I", file], {
        cwd: WORKSPACE,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
          PYTHONDONTWRITEBYTECODE: "1",
        },
      })
      let stdout = ""
      let stderr = ""
      const timer = setTimeout(() => {
        child.kill("SIGKILL")
        resolve({
          ok: false,
          stdout: stdout.slice(0, MAX_OUT),
          stderr: `${stderr}\nTimed out after ${TIMEOUT_MS / 1000}s.`.trim(),
        })
      }, TIMEOUT_MS)
      child.stdout.on("data", (chunk) => {
        stdout += String(chunk)
        if (stdout.length > MAX_OUT + 200) child.kill("SIGKILL")
      })
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk)
      })
      child.on("error", (err) => {
        clearTimeout(timer)
        resolve({ ok: false, stdout: "", stderr: err.message })
      })
      child.on("close", (code) => {
        clearTimeout(timer)
        resolve({
          ok: code === 0,
          stdout: stdout.slice(0, MAX_OUT),
          stderr: stderr.slice(0, 1200),
        })
      })
    })
  } finally {
    await unlink(file).catch(() => undefined)
  }
}
