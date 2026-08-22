import { getCoreSnapshot } from "@/lib/core/runtime"
import {
  createTask,
  saveMemory,
  searchMemories,
  syncVaultFacts,
  writeAudit,
} from "@/lib/db/store"
import { searchKnowledge } from "@/lib/knowledge/search"
import { runDoctor } from "@/lib/core/doctor"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const view = url.searchParams.get("view")
  if (view === "doctor") {
    return Response.json({ ok: true, doctor: await runDoctor() })
  }
  if (view === "memory") {
    return Response.json({ ok: true, memories: searchMemories(url.searchParams.get("q") || "", 20) })
  }
  if (view === "knowledge") {
    const hits = await searchKnowledge(url.searchParams.get("q") || "maya", 8)
    return Response.json({ ok: true, hits })
  }
  const snapshot = await getCoreSnapshot()
  return Response.json({ ok: true, ...snapshot })
}

export async function POST(request: Request) {
  let body: {
    action?: string
    content?: string
    type?: string
    title?: string
    facts?: Array<{ text: string; kind: string; confidence: number; source: string }>
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 })
  }
  if (body.action === "sync-facts" && Array.isArray(body.facts)) {
    syncVaultFacts(body.facts)
    return Response.json({ ok: true })
  }
  if (body.action === "remember" && body.content) {
    const row = saveMemory({ content: body.content, type: body.type || "fact", source: "api" })
    writeAudit({ event_type: "memory_save", actor: "api", allowed: true, input_summary: row.content })
    return Response.json({ ok: true, memory: row })
  }
  if (body.action === "task" && body.title) {
    const row = createTask({ title: body.title })
    return Response.json({ ok: true, task: row })
  }
  return Response.json({ error: "Unknown action." }, { status: 400 })
}
