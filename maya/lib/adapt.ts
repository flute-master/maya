import type { LearnedState, Personality } from "@/lib/types"

const STOP = new Set([
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
  "your",
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
])

export const DEFAULT_LEARNED: LearnedState = {
  samples: 0,
  avgLength: 110,
  hinglish: 0,
  emoji: 0,
  questionShare: 0,
  advicePull: 0.4,
  companyPull: 0.55,
  formality: 0.35,
  topics: [],
  firstSeenAt: 0,
  lastSeenAt: 0,
}

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n))
}

function ema(prev: number, next: number, samples: number) {
  const weight = Math.min(0.35, 2 / (samples + 1))
  return prev * (1 - weight) + next * weight
}

function looksHinglish(text: string) {
  return (
    /[\u0900-\u097F]/.test(text) ||
    /\b(yaar|bhai|acha|accha|theek|nahi|haan|kya|kaise|matlab|yaar+|bro)\b/i.test(
      text
    )
  )
}

function looksFormal(text: string) {
  return (
    /\b(regarding|therefore|kindly|however|appreciate|consider)\b/i.test(text) ||
    !/\b(gonna|wanna|yeah|ok|okay|idk|lol|haha)\b/i.test(text)
  )
}

function wantsAdvice(text: string) {
  return /\b(should i|what would you|advice|help me (decide|think)|how do i)\b/i.test(
    text
  )
}

function wantsCompany(text: string) {
  return /\b(lonely|just (need to )?talk|keep me company|i feel|sad|tired|can't sleep|cant sleep)\b/i.test(
    text
  )
}

function topicsFrom(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 4 && !STOP.has(word))
    .slice(0, 8)
}

export function updateLearned(
  previous: LearnedState,
  userText: string,
  now = Date.now()
): LearnedState {
  const samples = previous.samples + 1
  const length = userText.trim().length
  const nextTopics = previous.topics.map((item) => ({ ...item }))
  for (const word of topicsFrom(userText)) {
    const existing = nextTopics.find((item) => item.word === word)
    if (existing) existing.count += 1
    else nextTopics.push({ word, count: 1 })
  }
  nextTopics.sort((a, b) => b.count - a.count)

  return {
    samples,
    avgLength: ema(previous.avgLength, length, samples),
    hinglish: ema(previous.hinglish, looksHinglish(userText) ? 1 : 0, samples),
    emoji: ema(previous.emoji, /[\u2600-\u27BF]/.test(userText) || /[\uD83C-\uDBFF]/.test(userText) ? 1 : 0, samples),
    questionShare: ema(
      previous.questionShare,
      userText.includes("?") ? 1 : 0,
      samples
    ),
    advicePull: ema(
      previous.advicePull,
      wantsAdvice(userText) ? 1 : wantsCompany(userText) ? 0.2 : previous.advicePull,
      samples
    ),
    companyPull: ema(
      previous.companyPull,
      wantsCompany(userText) ? 1 : wantsAdvice(userText) ? 0.25 : previous.companyPull,
      samples
    ),
    formality: ema(previous.formality, looksFormal(userText) ? 0.8 : 0.2, samples),
    topics: nextTopics.slice(0, 12),
    firstSeenAt: previous.firstSeenAt || now,
    lastSeenAt: now,
  }
}

export function overlayPersonality(
  personality: Personality,
  learned: LearnedState
): Personality {
  if (learned.samples < 4) return personality
  const advisor = clamp(
    personality.advisor + (learned.advicePull - 0.45) * 28,
    0,
    100
  )
  const companion = clamp(
    personality.companion + (learned.companyPull - 0.45) * 28,
    0,
    100
  )
  const friend = clamp(
    personality.friend + (0.45 - learned.formality) * 18,
    0,
    100
  )
  let energy = personality.energy
  if (learned.avgLength < 55 && energy === "spirited") energy = "balanced"
  if (learned.avgLength > 220 && energy === "soft") energy = "balanced"
  return {
    ...personality,
    advisor,
    companion,
    friend,
    energy,
  }
}

export function describeLearned(learned: LearnedState): string {
  if (learned.samples < 4) {
    return "Still getting a feel for you. Keep talking — she learns from how you actually write, not from the internet."
  }
  const bits: string[] = []
  if (learned.avgLength < 70) bits.push("She answers shorter, matching you.")
  else if (learned.avgLength > 200) bits.push("She leaves room for longer talks.")
  if (learned.companyPull > learned.advicePull + 0.1) {
    bits.push("She's been leaning companion — presence more than plans.")
  } else if (learned.advicePull > learned.companyPull + 0.1) {
    bits.push("She's been leaning advisor — you keep asking her to think.")
  }
  if (learned.hinglish > 0.25) bits.push("Hinglish feels natural with you.")
  if (learned.formality < 0.3) bits.push("Informal, like a person not a desk.")
  const top = learned.topics[0]
  if (top && top.count >= 2) bits.push(`You've been circling “${top.word}”.`)
  return bits.join(" ") || "She's tracking the shape of how you talk."
}

export function prefersBrief(learned?: LearnedState) {
  return Boolean(learned && learned.samples >= 3 && learned.avgLength < 70)
}
