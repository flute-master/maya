import { spawn } from "node:child_process"
import { join } from "node:path"

const SCRIPT = join(process.cwd(), "scripts/flute-pitch.py")

export async function hearClip(filePath: string): Promise<{
  ok: boolean
  summary: string
  detail?: string
}> {
  const result = await new Promise<{ ok: boolean; text: string }>((resolve) => {
    const child = spawn("python3", [SCRIPT, filePath], {
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      resolve({ ok: false, text: '{"error":"Timed out reading the clip."}' })
    }, 14_000)
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk)
    })
    child.on("close", () => {
      clearTimeout(timer)
      resolve({ ok: true, text: stdout.trim() || stderr.trim() })
    })
    child.on("error", (err) => {
      clearTimeout(timer)
      resolve({ ok: false, text: err.message })
    })
  })

  let parsed: {
    ok?: boolean
    error?: string
    guessed_sa?: string
    notes?: string[]
    median_hz?: number
  } = {}
  try {
    parsed = JSON.parse(result.text) as typeof parsed
  } catch {
    return {
      ok: false,
      summary: "Could not read pitches from that clip.",
      detail: result.text.slice(0, 400),
    }
  }
  if (!parsed.ok || !parsed.notes?.length) {
    return {
      ok: false,
      summary: parsed.error || "No stable pitch in the clip.",
      detail:
        "Play one phrase, closer to the phone, less room noise. WAV or a short MP3 works. I guess Sa from the most common pitch — tell me if your Sa is a different letter.",
    }
  }
  return {
    ok: true,
    summary: `Heard ${parsed.notes.length} note change(s). Guessed Sa ≈ ${parsed.guessed_sa}.`,
    detail: [
      `Clip pitch (best effort, not a studio score):`,
      parsed.notes.join("  "),
      `Median ${parsed.median_hz} Hz. Guessed Sa pitch-class ${parsed.guessed_sa}.`,
      `If that Sa is wrong, tell me the letter on your bansuri (E, G, A…) and I will relabel.`,
      `Student bansuri: Sa ●●●○○○  Re ●●○○○○  Ga ●○○○○○  ma ○○○○○○  Pa ●●●●●●`,
    ].join("\n"),
  }
}
