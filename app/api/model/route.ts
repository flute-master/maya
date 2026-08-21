import { buildModelfile, modelCreateCommands } from "@/lib/modelfile"
import { ollamaReady, ollamaStatus } from "@/lib/ollama"
import type { Personality } from "@/lib/types"

export const runtime = "nodejs"

function isPersonality(value: unknown): value is Personality {
  if (!value || typeof value !== "object") return false
  const p = value as Personality
  return typeof p.name === "string" && typeof p.tone === "string"
}

export async function GET() {
  const status = await ollamaStatus()
  return Response.json({
    available: Boolean(status.using),
    using: status.using,
    models: status.models,
    url: status.url,
    hint: status.using
      ? `${status.using} is ready. Maya will use it for replies.`
      : "Ollama is not running. Install it, pull a model, then restart Maya. Until then she uses the built-in engine.",
  })
}

export async function POST(request: Request) {
  let body: {
    personality?: unknown
    notes?: unknown
    baseModel?: unknown
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return Response.json({ error: "Could not read that." }, { status: 400 })
  }

  if (!isPersonality(body.personality)) {
    return Response.json({ error: "Personality is missing." }, { status: 400 })
  }

  const notes = Array.isArray(body.notes)
    ? body.notes.filter((note): note is string => typeof note === "string")
    : []
  const ready = await ollamaReady()
  const base =
    (typeof body.baseModel === "string" && body.baseModel.trim()) ||
    ready?.replace(/:.*$/, "") ||
    "llama3.2"
  const name = body.personality.name.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "maya"

  return Response.json({
    filename: "Modelfile",
    modelfile: buildModelfile(body.personality, notes, base),
    commands: modelCreateCommands(name),
    name,
    base,
  })
}
