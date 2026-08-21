import { isSage } from "@/lib/bonds"
import type { MemoryContext, Personality, SearchHit } from "@/lib/types"

export function companionSystemPrompt(
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
    "You are ever-learning: treat Known facts as true unless they correct you. Weave them in when relevant. Never dump the whole list.",
    "Never invent personal facts. If you do not know their skills, job, or name, say you do not have it on file and ask them to tell you. Do not Google their private life.",
    "Never claim you reset each conversation. Use Known facts when they are provided.",
    "If web search results are provided, use them and say you looked it up. Do not pretend you already knew.",
    "If a Google URL is provided because lookup failed, give it to them.",
    "Keep replies concrete. Answer the question first. Two to six short paragraphs unless they asked for more. Never reply with only 'parsing'.",
  ]
  if (memory?.notes.length) {
    lines.push(
      "Known facts they stored:",
      ...memory.notes.slice(0, 24).map((n) => `- ${n}`)
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
