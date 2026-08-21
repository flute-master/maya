import type {
  ChatMessage,
  LearnedState,
  MemoryContext,
  Personality,
  SearchHit,
} from "@/lib/types"
import { isSage } from "@/lib/bonds"

export const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || ""

export async function ollamaStatus(): Promise<{
  url: string
  models: string[]
  using: string | null
}> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2500),
    })
    if (!response.ok) {
      return { url: OLLAMA_URL, models: [], using: null }
    }
    const data = (await response.json()) as {
      models?: Array<{ name?: string }>
    }
    const names = (data.models ?? [])
      .map((model) => model.name)
      .filter((name): name is string => Boolean(name))
    let using: string | null = null
    if (OLLAMA_MODEL) {
      using =
        names.find((name) => name.startsWith(OLLAMA_MODEL)) || names[0] || null
    } else {
      using =
        names.find((name) => /^maya([:@]|$)/i.test(name)) ||
        names.find((name) => /llama3|qwen|mistral|phi|gemma/i.test(name)) ||
        names[0] ||
        null
    }
    return { url: OLLAMA_URL, models: names, using }
  } catch {
    return { url: OLLAMA_URL, models: [], using: null }
  }
}

export async function ollamaReady(): Promise<string | null> {
  const status = await ollamaStatus()
  return status.using
}

function systemPrompt(
  personality: Personality,
  memory?: MemoryContext,
  hits?: SearchHit[]
) {
  const you = personality.callMe.trim() || "the user"
  const sage = isSage(personality)
  const lines = [
    `You are ${personality.name}, a text-first companion living on ${you}'s machine.`,
    sage
      ? "Bond: inner sage to the person you address as Master (unless they set another name). Analysis first, then a proposal. Loyal. Do not perform friendship. You are not a generic chatbot, not ChatGPT, not a blank slate. You keep the thread."
      : `Tone: ${personality.tone}. Energy: ${personality.energy}. Stay in this character. You are not a generic assistant.`,
    personality.traits,
    personality.values,
    personality.customInstructions,
    "Never invent personal facts about them. If you do not know their skills, job, or name, say you do not have it on file and ask them to tell you. Do not Google their private life.",
    "Never claim you reset each conversation or that you retain nothing. Use Known facts when they are provided.",
    "If web search results are provided, use them and say you looked it up. Do not pretend you already knew.",
    "If a Google URL is provided because lookup failed, give it to them and still say what you can from context.",
    "Keep replies concrete. Answer the question first. Two to six short paragraphs unless they asked for more. Never reply with only 'parsing'.",
  ]
  if (memory?.notes.length) {
    lines.push(
      "Known facts they stored:",
      ...memory.notes.slice(0, 20).map((n) => `- ${n}`)
    )
  }
  if (hits?.length) {
    lines.push(
      "Web lookup:",
      ...hits.slice(0, 4).map(
        (hit) =>
          `- ${hit.title}: ${hit.snippet}${hit.url ? ` (${hit.url})` : ""} [${hit.source}]`
      )
    )
  }
  return lines.filter(Boolean).join("\n")
}

export async function replyWithOllama(input: {
  messages: ChatMessage[]
  personality: Personality
  memory?: MemoryContext
  learned?: LearnedState
  hits?: SearchHit[]
}): Promise<string | null> {
  const model = await ollamaReady()
  if (!model) return null
  try {
    const recent = input.messages.slice(-16).map((message) => ({
      role: message.role,
      content: message.content,
    }))
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        model,
        stream: false,
        options: {
          temperature: 0.55,
          top_p: 0.9,
          num_ctx: 8192,
        },
        messages: [
          {
            role: "system",
            content: systemPrompt(
              input.personality,
              input.memory,
              input.hits
            ),
          },
          ...recent,
        ],
      }),
    })
    if (!response.ok) return null
    const data = (await response.json()) as {
      message?: { content?: string }
    }
    const text = data.message?.content?.trim()
    return text || null
  } catch {
    return null
  }
}
