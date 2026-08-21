import { overlayPersonality, DEFAULT_LEARNED } from "@/lib/adapt"
import { replyLocally } from "@/lib/local-companion"
import { ollamaReady, replyWithOllama } from "@/lib/ollama"
import {
  extractHttpUrl,
  fallbackSearchQuery,
  googleSearchUrl,
  modelNeedsWeb,
  searchQueryFor,
  searchWeb,
  readWebPage,
} from "@/lib/search"
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

function streamHeaders(mode: string, engine: string) {
  return {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Maya-Mode": mode,
    "X-Maya-Engine": engine,
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

function uniqueBySnippet(hits: SearchHit[]): SearchHit[] {
  const seen = new Set<string>()
  return hits.filter((hit) => {
    const key = hit.snippet.slice(0, 80)
    if (!hit.snippet.trim() || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

type Lookup = {
  hits: SearchHit[]
  searched: boolean
  searchFailed: boolean
  googleUrl?: string
}

async function lookupWeb(text: string, force: boolean): Promise<Lookup> {
  const pageUrl = extractHttpUrl(text)
  const query = force ? fallbackSearchQuery(text) : searchQueryFor(text)
  let hits: SearchHit[] = []
  let searched = false
  let searchFailed = false
  let googleUrl: string | undefined

  if (pageUrl) {
    searched = true
    try {
      const page = await readWebPage(pageUrl)
      if (page) hits.push(page)
      else searchFailed = true
    } catch {
      searchFailed = true
    }
  }

  if (query && !/^https?:\/\//i.test(query)) {
    searched = true
    googleUrl = googleSearchUrl(query)
    try {
      const web = await searchWeb(query)
      hits = uniqueBySnippet([...hits, ...web])
      if (!hits.length) searchFailed = true
    } catch {
      searchFailed = true
    }
  }

  return { hits, searched, searchFailed, googleUrl }
}

function hitsForModel(lookup: Lookup): SearchHit[] {
  if (lookup.hits.length) return lookup.hits
  if (lookup.searchFailed && lookup.googleUrl) {
    return [
      {
        title: "Google",
        snippet: `Lookup did not return a snippet. Open this search: ${lookup.googleUrl}`,
        source: "Google",
        url: lookup.googleUrl,
      },
    ]
  }
  return []
}

export async function GET() {
  const model = await ollamaReady()
  return Response.json({
    offline: true,
    search: true,
    ollama: Boolean(model),
    model,
  })
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

  let lookup: Lookup = allowSearch
    ? await lookupWeb(last.content, false)
    : { hits: [], searched: false, searchFailed: false }

  let ollamaText = await replyWithOllama({
    messages: history,
    personality,
    memory,
    learned,
    hits: hitsForModel(lookup),
  })

  if (
    ollamaText &&
    allowSearch &&
    !lookup.hits.length &&
    modelNeedsWeb(ollamaText)
  ) {
    lookup = await lookupWeb(last.content, true)
    const retry = await replyWithOllama({
      messages: history,
      personality,
      memory,
      learned,
      hits: hitsForModel(lookup),
    })
    if (retry) ollamaText = retry
  }

  const usedSearch = lookup.searched && lookup.hits.length > 0
  const text =
    ollamaText ||
    replyLocally(history, personality, memory, {
      learned,
      searchHits: lookup.hits,
      searchFailed: lookup.searched && !lookup.hits.length,
      searched: usedSearch || lookup.searched,
      googleUrl: lookup.googleUrl,
    })

  const mode =
    usedSearch || lookup.searched
      ? "search"
      : ollamaText
        ? "model"
        : "offline"

  return new Response(localStream(text), {
    headers: streamHeaders(mode, ollamaText ? "ollama" : "local"),
  })
}
