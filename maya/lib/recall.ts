import { newId } from "@/lib/id"
import { intendedMeaning } from "@/lib/typos"
import type {
  ChatMessage,
  MemoryContext,
  MemoryNote,
  MemoryVault,
} from "@/lib/types"

const FACT_PATTERNS: Array<RegExp> = [
  /(?:my name is|i'm called|i am called|call me)\s+([A-Za-z][A-Za-z' -]{1,40})/i,
  /i live in ([^.,!?\n]{2,60})/i,
  /i(?:'m| am) based in ([^.,!?\n]{2,60})/i,
  /i(?:'m| am) from ([^.,!?\n]{2,60})/i,
  /i work (?:as|at|in) ([^.,!?\n]{2,60})/i,
  /i study ([^.,!?\n]{2,80})/i,
  /i (?:go to|graduated from|studied at) ([^.,!?\n]{2,80})/i,
  /my skills? (?:are|is|:)\s*([^.,!?\n]{2,80})/i,
  /i(?:'m| am) good at ([^.,!?\n]{2,80})/i,
  /i (?:prefer|like|love|hate|don't like|do not like) ([^.,!?\n]{2,80})/i,
  /i speak ([^.,!?\n]{2,60})/i,
  /i(?:'m| am) (?:a|an) ([^.,!?\n]{2,50})/i,
  /i have a (?:partner|wife|husband|boyfriend|girlfriend|kid|son|daughter|dog|cat)(?: named ([A-Za-z][A-Za-z'-]{1,30}))?/i,
]

function clip(text: string, max = 160) {
  const compact = text.replace(/\s+/g, " ").trim()
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact
}

function meaningfulWords(text: string) {
  const stop = new Set([
    "that",
    "this",
    "with",
    "from",
    "have",
    "just",
    "want",
    "need",
    "about",
    "what",
    "when",
    "where",
    "which",
    "your",
    "youre",
    "they",
    "them",
    "then",
    "than",
    "some",
    "very",
    "really",
    "like",
    "been",
    "will",
    "would",
    "could",
    "should",
    "into",
    "over",
    "also",
    "here",
    "there",
    "were",
    "their",
    "name",
    "said",
    "tell",
    "does",
    "dont",
    "didn",
  ])
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !stop.has(word))
}

export function extractFacts(text: string): string[] {
  const source = intendedMeaning(text)
  const facts: string[] = []
  for (const pattern of FACT_PATTERNS) {
    const match = source.match(pattern)
    if (!match) continue
    const captured = (match[1] || match[0]).trim()
    if (captured.length < 2) continue
    if (/^(a|an|the|just|very|really|so|too)\b/i.test(captured)) continue
    facts.push(clip(match[0], 120))
  }
  return facts
}

export function mergeFacts(
  notes: MemoryNote[],
  facts: string[]
): MemoryNote[] {
  const next = [...notes]
  for (const fact of facts) {
    const exists = next.some(
      (note) => note.text.toLowerCase() === fact.toLowerCase()
    )
    if (exists) continue
    next.unshift({ id: newId(), text: fact, createdAt: Date.now() })
  }
  return next.slice(0, 100)
}

export function buildMemoryContext(
  vault: MemoryVault,
  currentMessages: ChatMessage[]
): MemoryContext {
  const currentId = vault.activeId
  const pastTitles = vault.conversations
    .filter(
      (conversation) =>
        conversation.id !== currentId && conversation.messages.length > 0
    )
    .slice(0, 8)
    .map((conversation) => conversation.title)

  const priorUserLines = currentMessages
    .filter((message) => message.role === "user")
    .slice(0, -1)
    .slice(-8)
    .map((message) => clip(message.content, 140))

  const notes = vault.notes.map((note) => note.text)

  if (vault.personality.callMe.trim()) {
    const nameFact = `You asked to be called ${vault.personality.callMe.trim()}`
    if (!notes.some((note) => note.toLowerCase().includes(vault.personality.callMe.trim().toLowerCase()))) {
      notes.unshift(nameFact)
    }
  }

  return { notes, pastTitles, priorUserLines }
}

export function formatMemoryForPrompt(memory: MemoryContext): string {
  const blocks: string[] = []
  if (memory.notes.length) {
    blocks.push(
      "Things you already know about them. Treat as true unless they correct you:",
      ...memory.notes.slice(0, 24).map((note) => `- ${note}`)
    )
  }
  if (memory.pastTitles.length) {
    blocks.push(
      "Earlier conversations you still have:",
      ...memory.pastTitles.map((title) => `- ${title}`)
    )
  }
  if (memory.priorUserLines.length) {
    blocks.push(
      "Earlier in this thread they said:",
      ...memory.priorUserLines.map((line) => `- ${line}`)
    )
  }
  if (!blocks.length) return ""
  blocks.push(
    "If something from memory is relevant, use it naturally. Do not dump the whole list."
  )
  return blocks.join("\n")
}

export function relevantMemories(
  memory: MemoryContext,
  latest: string,
  limit = 3
): string[] {
  const words = new Set(meaningfulWords(intendedMeaning(latest)))
  const scored = [...memory.notes, ...memory.priorUserLines]
    .map((line) => {
      const hits = meaningfulWords(line).filter((word) => words.has(word)).length
      return { line, hits }
    })
    .filter((item) => item.hits >= 2)
    .sort((a, b) => b.hits - a.hits)

  const picked = scored.slice(0, limit).map((item) => item.line)
  return picked
}

export const DIGEST_ID = "maya-digest"

export function upsertDigest(
  notes: MemoryNote[],
  messages: ChatMessage[]
): MemoryNote[] {
  const users = messages
    .filter((message) => message.role === "user")
    .map((message) => clip(intendedMeaning(message.content), 90))
  const rest = notes.filter((note) => note.id !== DIGEST_ID)
  if (users.length < 4) return rest
  return [
    {
      id: DIGEST_ID,
      text: `Recent thread: ${users.slice(-6).join(" · ")}`,
      createdAt: Date.now(),
    },
    ...rest,
  ].slice(0, 100)
}
