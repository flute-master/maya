import type { AtmosphereId } from "@/lib/atmosphere"
import type { MindFact, MindPlan } from "@/lib/mind"
import type { ReadingItem } from "@/lib/otaku"

export type { ReadingItem, MindFact, MindPlan }

export type Role = "user" | "assistant"

export type Tone = "warm" | "direct" | "playful" | "calm" | "witty"

export type Energy = "soft" | "balanced" | "spirited"

export type ChatMessage = {
  id: string
  role: Role
  content: string
  createdAt: number
  tools?: Array<{ name: string; summary: string }>
  pending?: Array<{
    name: string
    reason: string
    args?: Record<string, string>
  }>
}

export type Personality = {
  name: string
  callMe: string
  friend: number
  advisor: number
  companion: number
  tone: Tone
  energy: Energy
  traits: string
  values: string
  boundaries: string
  customInstructions: string
  voiceId: string
  bondId: "sage" | "friend" | "companion"
}

export type TopicCount = {
  word: string
  count: number
}

export type LearnedState = {
  samples: number
  avgLength: number
  hinglish: number
  emoji: number
  questionShare: number
  advicePull: number
  companyPull: number
  formality: number
  topics: TopicCount[]
  firstSeenAt: number
  lastSeenAt: number
}

export type Reminder = {
  id: string
  kind: "reminder" | "alarm"
  text: string
  at: number
  done: boolean
  fired: boolean
  createdAt: number
  calendarUrl?: string
}

export type TaskItem = {
  id: string
  text: string
  done: boolean
  createdAt: number
}
export type Prefs = {
  allowSearch: boolean
  spokenVoiceURI: string
  speakReplies: boolean
  onDeviceModel: boolean
  useTrainedBrain: boolean
  allowPython: boolean
  allowFileWrite: boolean
  allowGoogleWrite: boolean
  atmosphere: AtmosphereId
  sageMode: boolean
}

export type Conversation = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
}

export type MemoryNote = {
  id: string
  text: string
  createdAt: number
}

export type MemoryVault = {
  version: number
  personality: Personality
  conversations: Conversation[]
  activeId: string
  notes: MemoryNote[]
  learned: LearnedState
  prefs: Prefs
  reminders: Reminder[]
  tasks: TaskItem[]
  reading: ReadingItem[]
  facts: MindFact[]
  plans: MindPlan[]
}

export type MemoryContext = {
  notes: string[]
  pastTitles: string[]
  priorUserLines: string[]
  reminders: string[]
  tasks: string[]
  reading: string[]
  facts: string[]
  plans: string[]
  sageMode: boolean
  mindFacts?: MindFact[]
  mindPlans?: MindPlan[]
}

export type SearchHit = {
  title: string
  snippet: string
  source: string
  url: string
}

export type ChatRequestBody = {
  messages: Array<Pick<ChatMessage, "role" | "content">>
  personality: Personality
  memory?: MemoryContext
  learned?: LearnedState
  allowSearch?: boolean
  useTrained?: boolean
  allowPython?: boolean
  allowFileWrite?: boolean
  allowGoogleWrite?: boolean
  approved?: Array<{ name: string; args?: Record<string, string> }>
  origin?: { lat?: number; lon?: number }
  lastPlace?: string
}

export type MayaExport = {
  kind: "maya-memory" | "mitra-memory"
  version: number
  exportedAt: number
  personality: Personality
  conversations: Conversation[]
  notes: MemoryNote[]
  learned?: LearnedState
  prefs?: Prefs
  reminders?: Reminder[]
  tasks?: TaskItem[]
  reading?: ReadingItem[]
  facts?: MindFact[]
  plans?: MindPlan[]
}
