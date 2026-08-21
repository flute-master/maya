export type Role = "user" | "assistant"

export type Tone = "warm" | "direct" | "playful" | "calm" | "witty"

export type Energy = "soft" | "balanced" | "spirited"

export type ChatMessage = {
  id: string
  role: Role
  content: string
  createdAt: number
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

export type Prefs = {
  allowSearch: boolean
  spokenVoiceURI: string
  speakReplies: boolean
  onDeviceModel: boolean
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
  version: 1
  personality: Personality
  conversations: Conversation[]
  activeId: string
  notes: MemoryNote[]
  learned: LearnedState
  prefs: Prefs
}

export type MemoryContext = {
  notes: string[]
  pastTitles: string[]
  priorUserLines: string[]
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
}

export type MayaExport = {
  kind: "maya-memory" | "mitra-memory"
  version: 1
  exportedAt: number
  personality: Personality
  conversations: Conversation[]
  notes: MemoryNote[]
  learned?: LearnedState
  prefs?: Prefs
}
