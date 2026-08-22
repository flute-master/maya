import { readBrainInstall, startBrainInstall } from "@/lib/brain-setup"
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
  const install = readBrainInstall()
  return Response.json({
    available: Boolean(status.using),
    using: status.using,
    models: status.models,
    url: status.url,
    install,
    hint: status.using
      ? `${status.using} is ready. That is the offline brain. Load it with OLLAMA_MODEL=maya npm run dev. See BRAIN.md.`
      : install.running
        ? install.step || "Downloading the offline brain…"
        : "No local model yet. One-time: npm run brain — or click Install offline brain if Ollama is running. Until then she uses the built-in engine. BRAIN.md has the load steps.",
  })
}

export async function POST(request: Request) {
  let body: {
    action?: unknown
    personality?: unknown
    notes?: unknown
    baseModel?: unknown
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return Response.json({ error: "Could not read that." }, { status: 400 })
  }

  if (body.action === "install") {
    const started = startBrainInstall(
      typeof body.baseModel === "string" && body.baseModel.trim()
        ? body.baseModel.trim()
        : "llama3.2"
    )
    if (!started.ok) {
      return Response.json({ error: started.error, ...readBrainInstall() }, { status: 409 })
    }
    return Response.json({ ok: true, pid: started.pid, ...readBrainInstall() })
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
