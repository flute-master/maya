import { replyLocally } from "@/lib/local-companion"
import { ollamaReady, replyWithOllama } from "@/lib/ollama"
import type {
  ChatMessage,
  LearnedState,
  MemoryContext,
  Personality,
  SearchHit,
} from "@/lib/types"

/** The model is a component. It does not select or run tools. */
export type BrainKind = "ollama" | "local-fallback"

export type BrainRequest = {
  messages: ChatMessage[]
  personality: Personality
  memory?: MemoryContext
  learned?: LearnedState
  hits?: SearchHit[]
  toolContext?: string
}

export type Brain = {
  id: BrainKind
  label: string
  offline: boolean
  ready: () => Promise<boolean>
  generate: (request: BrainRequest) => Promise<string | null>
}

export const ollamaBrain: Brain = {
  id: "ollama",
  label: "Ollama (local)",
  offline: true,
  ready: async () => Boolean(await ollamaReady()),
  generate: async (request) => replyWithOllama(request),
}

export const fallbackBrain: Brain = {
  id: "local-fallback",
  label: "Built-in engine",
  offline: true,
  ready: async () => true,
  generate: async (request) =>
    replyLocally(request.messages, request.personality, request.memory, {
      learned: request.learned,
      searchHits: request.hits,
    }),
}

export async function pickBrain(preferOllama = true): Promise<Brain> {
  if (preferOllama && (await ollamaBrain.ready())) return ollamaBrain
  return fallbackBrain
}

export async function describeBrain() {
  const model = await ollamaReady()
  return {
    default: model ? "ollama" : "local-fallback",
    ollama: Boolean(model),
    model: model || "built-in",
    offline: true,
    note: model
      ? "Local Ollama is up. World facts still use lookup when the network is on."
      : "No Ollama. She still answers with the built-in engine. Offline skills keep working.",
  }
}
