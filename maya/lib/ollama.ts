import type {
  ChatMessage,
  LearnedState,
  MemoryContext,
  Personality,
  SearchHit,
} from "@/lib/types"
import { isSage } from "@/lib/bonds"

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || ""

export async function ollamaReady(): Promise<string | null> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(800),
    })
    if (!response.ok) return null
    const data = (await response.json()) as {
      models?: Array<{ name?: string }>
    }
    const names = (data.models ?? [])
      .map((model) => model.name)
      .filter((name): name is string => Boolean(name))
    if (OLLAMA_MODEL) {
      const match = names.find((name) => name.startsWith(OLLAMA_MODEL))
      return match || (names[0] ?? null)
    }
    const preferred = names.find((name) =>
      /llama3|qwen|mistral|phi|gemma/i.test(name)
    )
    return preferred || names[0] || null
  } catch {
    return null
  }
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
      ? "Bond: inner sage. Analysis first, then a proposal. Loyal. Do not perform friendship. Do not say you are parsing unless you then actually answer."
      : `Tone: ${personality.tone}. Energy: ${personality.energy}.`,
    personality.traits,
    personality.values,
    personality.customInstructions,
    "Never invent personal facts about them. If you do not know their skills, job, or name, say you do not have it on file and ask them to tell you.",
    "If web search results are provided, use them and say you looked it up. Do not pretend you already knew.",
    "Keep replies concrete. Answer the question. Two to six short paragraphs unless they asked for more.",
  ]
  if (memory?.notes.length) {
    lines.push("Known facts they stored:", ...memory.notes.slice(0, 20).map((n) => `- ${n}`))
  }
  if (hits?.length) {
    lines.push(
      "Web lookup:",
      ...hits.slice(0, 3).map((hit) => `- ${hit.snippet} (${hit.source})`)
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
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model,
        stream: false,
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
