"use client"

import { companionSystemPrompt } from "@/lib/companion-prompt"
import { interpretLastUser } from "@/lib/typos"
import type {
  ChatMessage,
  MemoryContext,
  Personality,
  SearchHit,
} from "@/lib/types"

export const PHONE_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC"
export const DESKTOP_MODEL = "Llama-3.2-3B-Instruct-q4f16_1-MLC"

type ChatResult =
  | { choices?: Array<{ message?: { content?: string } }> }
  | AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>

type Engine = {
  chat: {
    completions: {
      create: (input: {
        messages: Array<{ role: string; content: string }>
        temperature?: number
        max_tokens?: number
        stream?: boolean
      }) => Promise<ChatResult>
    }
  }
}

let engine: Engine | null = null
let loading: Promise<string> | null = null
let loadedId: string | null = null

export function canRunOnDevice() {
  if (typeof navigator === "undefined") return false
  return Boolean((navigator as Navigator & { gpu?: unknown }).gpu)
}

export function pickOnDeviceModel() {
  if (typeof navigator === "undefined") return PHONE_MODEL
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const wide = typeof window !== "undefined" && window.innerWidth >= 768
  if (wide && (memory == null || memory >= 6)) return DESKTOP_MODEL
  return PHONE_MODEL
}

export function onDeviceReady() {
  return loadedId
}

export async function loadOnDeviceModel(
  onProgress?: (text: string) => void,
  modelId = pickOnDeviceModel()
): Promise<string | null> {
  if (!canRunOnDevice()) return null
  if (engine && loadedId === modelId) return loadedId
  if (loading) return loading
  loading = (async () => {
    onProgress?.("Loading a free on-device model (once per browser)…")
    const webllm = await import("@mlc-ai/web-llm")
    engine = (await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: (report: { text?: string }) => {
        if (report.text) onProgress?.(report.text)
      },
    })) as unknown as Engine
    loadedId = modelId
    onProgress?.(`On-device model ready: ${modelId}`)
    return modelId
  })()
  try {
    return await loading
  } catch (error) {
    engine = null
    loadedId = null
    loading = null
    throw error
  } finally {
    loading = null
  }
}

export async function replyOnDevice(input: {
  messages: ChatMessage[]
  personality: Personality
  memory?: MemoryContext
  hits?: SearchHit[]
  toolContext?: string
  onToken?: (text: string) => void
}): Promise<string | null> {
  if (!engine) return null
  const recent = interpretLastUser(input.messages.slice(-12)).map(
    (message) => ({
      role: message.role,
      content: message.content,
    })
  )
  const created = await engine.chat.completions.create({
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
    temperature: 0.55,
    max_tokens: 700,
    stream: Boolean(input.onToken),
  })

  if (input.onToken && created && typeof created === "object" && Symbol.asyncIterator in created) {
    let acc = ""
    for await (const chunk of created as AsyncIterable<{
      choices?: Array<{ delta?: { content?: string } }>
    }>) {
      const piece = chunk.choices?.[0]?.delta?.content ?? ""
      if (!piece) continue
      acc += piece
      input.onToken(acc)
    }
    return acc.trim() || null
  }

  const data = created as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  return text || null
}
