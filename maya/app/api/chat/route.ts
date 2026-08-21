import { overlayPersonality, DEFAULT_LEARNED } from "@/lib/adapt"
import { replyLocally } from "@/lib/local-companion"
import { searchQueryFor, searchWeb } from "@/lib/search"
import type {
  ChatMessage,
  ChatRequestBody,
  Personality,
  SearchHit,
} from "@/lib/types"

export const runtime = "nodejs"

const encoder = new TextEncoder()

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

function asMessages(incoming: ChatRequestBody["messages"]): ChatMessage[] {
  return incoming.map((message, index) => ({
    id: `${index}`,
    role: message.role,
    content: message.content,
    createdAt: index,
  }))
}

function streamHeaders(mode: string) {
  return {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Maya-Mode": mode,
    "X-Accel-Buffering": "no",
  }
}

function localStream(text: string) {
  const parts = text.split(/(\s+)/).filter(Boolean)
  let i = 0
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (i >= parts.length) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(parts[i]))
      i += 1
      await new Promise((resolve) => setTimeout(resolve, 10))
    },
  })
}

function isPersonality(value: unknown): value is Personality {
  if (!value || typeof value !== "object") return false
  const p = value as Personality
  return typeof p.name === "string" && typeof p.tone === "string"
}

export async function GET() {
  return Response.json({ offline: true, search: true })
}

export async function POST(request: Request) {
  let body: ChatRequestBody
  try {
    body = (await request.json()) as ChatRequestBody
  } catch {
    return jsonError("Maya couldn't read that message.")
  }

  if (!body?.messages?.length || !isPersonality(body.personality)) {
    return jsonError("Say something, and keep a personality attached.")
  }

  const last = body.messages.at(-1)
  if (!last || last.role !== "user" || !last.content.trim()) {
    return jsonError("There's nothing to answer yet.")
  }

  const history = asMessages(body.messages).slice(-80)
  const learned = body.learned ?? DEFAULT_LEARNED
  const personality = overlayPersonality(body.personality, learned)
  const memory = body.memory
  const allowSearch = body.allowSearch !== false
  const query = allowSearch ? searchQueryFor(last.content) : null

  let hits: SearchHit[] = []
  let searched = false
  let searchFailed = false

  if (query) {
    searched = true
    try {
      hits = await searchWeb(query)
      if (!hits.length) searchFailed = true
    } catch {
      searchFailed = true
    }
  }

  const text = replyLocally(history, personality, memory, {
    learned,
    searchHits: hits,
    searchFailed,
    searched,
  })

  return new Response(localStream(text), {
    headers: streamHeaders(searched ? "search" : "offline"),
  })
}
