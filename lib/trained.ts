import { spawn } from "node:child_process"
import { mkdirSync, openSync, writeFileSync } from "node:fs"
import { access } from "node:fs/promises"
import { join } from "node:path"

import { isMusicQuery } from "@/lib/music"
import { isClearScreenCommand, isCreativeQuery, isJokeFollowUp, isMapsQuery } from "@/lib/skills"
import type {
  ChatMessage,
  MemoryContext,
  Personality,
  SearchHit,
} from "@/lib/types"

const ROOT = process.cwd()
export const TRAINED_CKPT = join(ROOT, "data", "maya-gpt.pt")
export const TRAIN_STATUS = join(ROOT, "data", "train-status.json")

export function trainedReplyUsable(text: string) {
  const t = text.replace(/\s+/g, " ").trim()
  if (t.length < 16) return false
  const words = t.toLowerCase().match(/[a-z']+/g) ?? []
  if (words.length < 5) return false
  for (let i = 1; i < words.length; i += 1) {
    if (words[i] === words[i - 1] && (words[i]?.length ?? 0) > 2) return false
  }
  const unique = new Set(words)
  if (unique.size < Math.min(6, Math.ceil(words.length * 0.4))) return false
  return true
}

/** Skip the tiny from-scratch net — not Ollama. Short talk still uses `maya`. */
export function skipTinyNet(text: string) {
  const t = text.trim().toLowerCase()
  if (t.length < 24) return true
  if (isCreativeQuery(text) || isJokeFollowUp(text) || isMapsQuery(text) || isMusicQuery(text)) return true
  if (isClearScreenCommand(text)) return true
  return (
    /^(hi|hey|hello|yo|hola|namaste|thanks|thank you|bye|goodbye)\b/.test(t) ||
    /what can you (actually )?do|who are you|what are you|tell me about yourself/.test(
      t
    )
  )
}

export async function trainedReady() {
  try {
    await access(TRAINED_CKPT)
    return true
  } catch {
    return false
  }
}

function pythonBin() {
  return process.env.PYTHON || process.env.PYTHON3 || "python3"
}

export function buildTrainPrompt(input: {
  messages: ChatMessage[]
  personality: Personality
  memory?: MemoryContext
  hits?: SearchHit[]
}) {
  const lines: string[] = []
  const notes = input.memory?.notes?.slice(0, 8) ?? []
  lines.push(
    `<|mem|> You are ${input.personality.name}. Address ${input.personality.callMe || "Master"}.`
  )
  if (notes.length) {
    lines.push(`<|mem|> ${notes.join(" | ")}`)
  }
  if (input.hits?.length) {
    lines.push(
      `<|mem|> lookup: ${input.hits
        .slice(0, 2)
        .map((hit) => hit.snippet.replace(/\s+/g, " ").slice(0, 180))
        .join(" / ")}`
    )
  }
  const recent = input.messages.slice(-6)
  for (const message of recent) {
    if (message.role === "user") {
      lines.push(`<|user|> ${message.content.replace(/\s+/g, " ").trim()}`)
    } else if (message.content.trim()) {
      lines.push(`<|maya|> ${message.content.replace(/\s+/g, " ").trim()}`)
    }
  }
  const last = recent.at(-1)
  if (!last || last.role !== "user") {
    lines.push("<|user|> hello")
  }
  lines.push("<|maya|> ")
  return lines.join("\n")
}

export async function replyWithTrained(input: {
  messages: ChatMessage[]
  personality: Personality
  memory?: MemoryContext
  hits?: SearchHit[]
}): Promise<string | null> {
  if (!(await trainedReady())) return null
  const prompt = buildTrainPrompt(input)
  return await new Promise((resolve) => {
    const child = spawn(
      pythonBin(),
      [join(ROOT, "train", "generate.py"), "--prompt", prompt, "--max-tokens", "90"],
      { cwd: ROOT }
    )
    let out = ""
    let err = ""
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      resolve(null)
    }, 20000)
    child.stdout.on("data", (chunk) => {
      out += String(chunk)
    })
    child.stderr.on("data", (chunk) => {
      err += String(chunk)
    })
    child.on("error", () => {
      clearTimeout(timer)
      resolve(null)
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      const text = out.trim()
      if (code !== 0 || text.length < 8) {
        resolve(null)
        return
      }
      void err
      resolve(trainedReplyUsable(text) ? text.slice(0, 1200) : null)
    })
  })
}

export function startTraining(steps = 1200) {
  const dataDir = join(ROOT, "data")
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(
    TRAIN_STATUS,
    JSON.stringify(
      {
        running: true,
        step: 0,
        steps,
        loss: null,
        ready: false,
        error: null,
        updatedAt: Date.now() / 1000,
      },
      null,
      2
    )
  )
  const log = join(dataDir, "train.log")
  const out = openSync(log, "a")
  const child = spawn(
    pythonBin(),
    [join(ROOT, "train", "train.py"), "--steps", String(steps)],
    {
      cwd: ROOT,
      detached: true,
      stdio: ["ignore", out, out],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    }
  )
  child.on("error", () => {
    writeFileSync(
      TRAIN_STATUS,
      JSON.stringify(
        {
          running: false,
          ready: false,
          error: "python3 failed to start. pip install -r requirements-train.txt",
          updatedAt: Date.now() / 1000,
        },
        null,
        2
      )
    )
  })
  child.unref()
  return child.pid ?? null
}
