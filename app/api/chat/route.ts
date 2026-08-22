import { overlayPersonality, DEFAULT_LEARNED } from "@/lib/adapt"
import { replyLocally } from "@/lib/local-companion"
import { hitsForModel, lookupWeb, type Lookup } from "@/lib/lookup"
import { ollamaReady, replyWithOllama } from "@/lib/ollama"
import { confirmCopy, formatToolContext, runSage } from "@/lib/sage/run"
import { modelNeedsWeb } from "@/lib/search"
import { hometownFromNotes } from "@/lib/skills"
import { readPublicIdentity } from "@/lib/identity"
import { replyWithTrained, skipTinyNet, trainedReady } from "@/lib/trained"
import type {
  ChatMessage,
  ChatRequestBody,
  Personality,
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

function headerSafe(value: string) {
  return value.replace(/[^\u0000-\u00FF]/g, (ch) => {
    const map: Record<string, string> = {
      "→": "->",
      "←": "<-",
      "—": "-",
      "–": "-",
      "“": '"',
      "”": '"',
      "‘": "'",
      "’": "'",
      "…": "...",
      "•": "*",
    }
    return map[ch] ?? "?"
  })
}

function streamHeaders(input: {
  mode: string
  engine: string
  learn?: string[]
  tools?: unknown
  confirm?: unknown
}) {
  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Maya-Mode": input.mode,
    "X-Maya-Engine": input.engine,
    "X-Accel-Buffering": "no",
  }
  const expose = ["X-Maya-Mode", "X-Maya-Engine"]
  if (input.learn?.length) {
    headers["X-Maya-Learn"] = headerSafe(JSON.stringify(input.learn.slice(0, 8)))
    expose.push("X-Maya-Learn")
  }
  if (input.tools) {
    headers["X-Maya-Tools"] = headerSafe(JSON.stringify(input.tools))
    expose.push("X-Maya-Tools")
  }
  if (input.confirm) {
    headers["X-Maya-Confirm"] = headerSafe(JSON.stringify(input.confirm))
    expose.push("X-Maya-Confirm")
  }
  headers["Access-Control-Expose-Headers"] = expose.join(", ")
  return headers
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
  const model = await ollamaReady()
  return Response.json({
    offline: true,
    search: true,
    ollama: Boolean(model),
    model,
    sage: true,
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
  const hometown = hometownFromNotes(memory?.notes)
  const identity = readPublicIdentity(
    [...(memory?.notes ?? []), ...(memory?.priorUserLines ?? [])],
    personality.callMe
  )
  const allowSearch = body.allowSearch !== false

  const sage = await runSage({
    text: last.content,
    memory,
    hometown,
    identity,
    trust: {
      allowSearch,
      allowPython: body.allowPython === true,
      allowFileWrite: body.allowFileWrite === true,
      allowGoogleWrite: body.allowGoogleWrite === true,
    },
    approved: body.approved,
  })

  const toolTrace = [
    ...sage.results.map((item) => ({ name: item.name, summary: item.summary })),
    ...sage.pending.map((item) => ({
      name: item.name,
      summary: `needs permission: ${item.reason}`,
    })),
  ]

  if (sage.pending.length) {
    return new Response(localStream(confirmCopy(sage.pending)), {
      headers: streamHeaders({
        mode: "sage",
        engine: "sage",
        tools: toolTrace,
        confirm: sage.pending,
      }),
    })
  }

  const googleRan = sage.results.some((item) => item.name.startsWith("google_"))
  const grounded = sage.results.some((item) => item.name !== "recall")
  const skipBrain = skipTinyNet(last.content)

  let lookup: Lookup =
    allowSearch && !googleRan && !grounded && !skipBrain
      ? await lookupWeb(last.content, false, hometown, identity)
      : { hits: [], searched: false, searchFailed: false }

  for (const result of sage.results) {
    if (
      result.ok &&
      result.detail &&
      (result.name === "weather" || result.name === "fetch_page" || result.name === "maps")
    ) {
      lookup.hits.unshift({
        title: result.summary,
        snippet: result.detail,
        source: result.name,
        url: "",
      })
      lookup.searched = true
    }
  }

  const hits = hitsForModel(lookup)
  const toolContext = formatToolContext(sage)
  const toolHeavy = sage.results.some((item) =>
    [
      "python",
      "files_read",
      "files_write",
      "files_list",
      "fetch_page",
      "observe",
      "weather",
      "maps",
      "flute",
      "google_calendar",
      "google_gmail",
      "google_drive",
      "google_docs",
      "google_sheets",
      "google_tasks",
      "google_people",
    ].includes(item.name)
  )
  const localOnly = skipBrain && !toolHeavy && !grounded && hits.length === 0

  let trainedText: string | null = null
  if (
    !localOnly &&
    !toolHeavy &&
    !skipBrain &&
    body.useTrained !== false &&
    (await trainedReady())
  ) {
    trainedText = await replyWithTrained({
      messages: history,
      personality,
      memory,
      hits,
    })
  }

  let ollamaText =
    localOnly || trainedText || googleRan || grounded || skipBrain
      ? null
      : await replyWithOllama({
          messages: history,
          personality,
          memory,
          learned,
          hits,
          toolContext,
        })

  if (
    ollamaText &&
    allowSearch &&
    !lookup.hits.length &&
    modelNeedsWeb(ollamaText)
  ) {
    lookup = await lookupWeb(last.content, true, hometown, identity)
    const retry = await replyWithOllama({
      messages: history,
      personality,
      memory,
      learned,
      hits: hitsForModel(lookup),
      toolContext,
    })
    if (retry) ollamaText = retry
  }

  const usedSearch = lookup.searched && lookup.hits.length > 0
  const text =
    trainedText ||
    ollamaText ||
    replyLocally(history, personality, memory, {
      learned,
      searchHits: lookup.hits,
      searchFailed: lookup.searched && !lookup.hits.length,
      searched: usedSearch || lookup.searched,
      googleUrl: lookup.googleUrl,
      toolResults: sage.results,
    })

  const engine = trainedText
    ? "trained"
    : ollamaText
      ? "ollama"
      : sage.results.length
        ? "sage"
        : "local"
  const mode =
    sage.results.length && toolHeavy
      ? "sage"
      : usedSearch || lookup.searched
        ? "search"
        : trainedText
          ? "trained"
          : ollamaText
            ? "model"
            : "offline"

  return new Response(localStream(text), {
    headers: streamHeaders({
      mode,
      engine,
      learn: lookup.learn,
      tools: toolTrace.length ? toolTrace : undefined,
    }),
  })
}
