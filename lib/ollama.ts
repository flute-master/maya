import { companionSystemPrompt } from "@/lib/companion-prompt"
import { interpretLastUser } from "@/lib/typos"
import type {
  ChatMessage,
  LearnedState,
  MemoryContext,
  Personality,
  SearchHit,
} from "@/lib/types"

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

export async function replyWithOllama(input: {
  messages: ChatMessage[]
  personality: Personality
  memory?: MemoryContext
  learned?: LearnedState
  hits?: SearchHit[]
  toolContext?: string
}): Promise<string | null> {
  const model = await ollamaReady()
  if (!model) return null
  try {
    const recent = interpretLastUser(input.messages.slice(-16)).map(
      (message) => ({
        role: message.role,
        content: message.content,
      })
    )
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
            content: companionSystemPrompt(
              input.personality,
              input.memory,
              input.hits,
              input.toolContext
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
    if (!text) return null
    if (looksGenericAssistant(text)) return null
    return text
  } catch {
    return null
  }
}

export function looksGenericAssistant(text: string) {
  return /as an ai|language model|i don'?t have (personal )?(intelligence|consciousness)|what can i help you with today|i('m| am) (just |only )?(an? )?(ai|assistant|chatbot|language model)\b/i.test(
    text
  )
}
