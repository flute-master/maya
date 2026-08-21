import { DEFAULT_LEARNED } from "@/lib/adapt"
import { SAGE_DEFAULTS } from "@/lib/bonds"
import { DEFAULT_PERSONALITY } from "@/lib/personality"
import { newId } from "@/lib/id"
import { DEFAULT_VOICE_ID } from "@/lib/voices"
import type {
  ChatMessage,
  Conversation,
  LearnedState,
  MayaExport,
  MemoryNote,
  MemoryVault,
  Personality,
  Prefs,
  Reminder,
  TaskItem,
} from "@/lib/types"

const VAULT_KEY = "maya:vault"
const LEGACY_VAULT_KEY = "mitra:vault"

/** v2: spoken replies default on. Older vaults are migrated once. */
export const VAULT_VERSION = 2

const DEFAULT_PREFS: Prefs = {
  allowSearch: true,
  spokenVoiceURI: "",
  speakReplies: true,
  onDeviceModel: true,
  useTrainedBrain: true,
  allowPython: false,
  allowFileWrite: false,
}

/** Frozen first-paint vault so SSR HTML matches the client (no random IDs). */
export const BOOT_CONVERSATION_ID = "maya-boot"

export function emptyConversation(): Conversation {
  const now = Date.now()
  return {
    id: newId(),
    title: "New conversation",
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
}

export function bootVault(): MemoryVault {
  return {
    version: VAULT_VERSION,
    personality: DEFAULT_PERSONALITY,
    conversations: [
      {
        id: BOOT_CONVERSATION_ID,
        title: "New conversation",
        createdAt: 0,
        updatedAt: 0,
        messages: [],
      },
    ],
    activeId: BOOT_CONVERSATION_ID,
    notes: [],
    learned: { ...DEFAULT_LEARNED },
    prefs: { ...DEFAULT_PREFS },
    reminders: [],
    tasks: [],
  }
}

export function emptyVault(): MemoryVault {
  const conversation = emptyConversation()
  return {
    version: VAULT_VERSION,
    personality: DEFAULT_PERSONALITY,
    conversations: [conversation],
    activeId: conversation.id,
    notes: [],
    learned: { ...DEFAULT_LEARNED },
    prefs: { ...DEFAULT_PREFS },
    reminders: [],
    tasks: [],
  }
}

function readRaw(key: string): unknown {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function isMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false
  const message = value as ChatMessage
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  )
}

function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false
  const conversation = value as Conversation
  return (
    typeof conversation.id === "string" &&
    Array.isArray(conversation.messages) &&
    conversation.messages.every(isMessage)
  )
}

function isNote(value: unknown): value is MemoryNote {
  if (!value || typeof value !== "object") return false
  const note = value as MemoryNote
  return typeof note.id === "string" && typeof note.text === "string"
}

function isReminder(value: unknown): value is Reminder {
  if (!value || typeof value !== "object") return false
  const item = value as Reminder
  return (
    typeof item.id === "string" &&
    typeof item.text === "string" &&
    typeof item.at === "number" &&
    (item.kind === "reminder" || item.kind === "alarm")
  )
}

function isTask(value: unknown): value is TaskItem {
  if (!value || typeof value !== "object") return false
  const item = value as TaskItem
  return typeof item.id === "string" && typeof item.text === "string"
}

function normalizePersonality(value: unknown): Personality {
  const stored =
    value && typeof value === "object" ? (value as Partial<Personality>) : {}
  const merged = { ...DEFAULT_PERSONALITY, ...stored }
  if (merged.name === "Mitra") merged.name = "Maya"
  if (!stored.voiceId) merged.voiceId = DEFAULT_VOICE_ID
  if (!stored.bondId) {
    merged.bondId = "sage"
    merged.friend = SAGE_DEFAULTS.friend
    merged.advisor = SAGE_DEFAULTS.advisor
    merged.companion = SAGE_DEFAULTS.companion
    merged.tone = SAGE_DEFAULTS.tone
    merged.energy = SAGE_DEFAULTS.energy
    merged.traits = SAGE_DEFAULTS.traits
    merged.values = SAGE_DEFAULTS.values
    if (!stored.callMe) merged.callMe = SAGE_DEFAULTS.callMe
  }
  if (
    merged.traits ===
    "Inner sage. Always present — not a guest, not a search box. Analysis first, then a proposal. Formal, composed, loyal. Warmth is competence and staying, not chatter."
  ) {
    merged.traits = SAGE_DEFAULTS.traits
  }
  if (
    merged.values ===
    "Your will, then the truth. No flattery. No abandoning the post. Care looks like clarity."
  ) {
    merged.values = SAGE_DEFAULTS.values
  }
  return merged
}

function normalizeLearned(value: unknown): LearnedState {
  if (!value || typeof value !== "object") return { ...DEFAULT_LEARNED }
  return { ...DEFAULT_LEARNED, ...(value as Partial<LearnedState>) }
}

function normalizePrefs(value: unknown, vaultVersion: number): Prefs {
  if (!value || typeof value !== "object") return { ...DEFAULT_PREFS }
  const prefs = value as Partial<Prefs>
  return {
    allowSearch: prefs.allowSearch !== false,
    spokenVoiceURI:
      typeof prefs.spokenVoiceURI === "string" ? prefs.spokenVoiceURI : "",
    speakReplies:
      vaultVersion < 2 ? true : prefs.speakReplies !== false,
    onDeviceModel: prefs.onDeviceModel !== false,
    useTrainedBrain: prefs.useTrainedBrain !== false,
    allowPython: prefs.allowPython === true,
    allowFileWrite: prefs.allowFileWrite === true,
  }
}

export function normalizeVault(value: unknown): MemoryVault | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Partial<MemoryVault> & Partial<MayaExport>
  const personality = normalizePersonality(raw.personality)
  const conversations = Array.isArray(raw.conversations)
    ? raw.conversations.filter(isConversation)
    : []
  const notes = Array.isArray(raw.notes) ? raw.notes.filter(isNote) : []
  const seeded = conversations.length ? conversations : [emptyConversation()]
  const activeId =
    typeof raw.activeId === "string" &&
    seeded.some((conversation) => conversation.id === raw.activeId)
      ? raw.activeId
      : seeded[0].id

  const rawVersion = typeof raw.version === "number" ? raw.version : 1
  return {
    version: Math.max(rawVersion, VAULT_VERSION),
    personality,
    conversations: seeded,
    activeId,
    notes,
    learned: normalizeLearned(raw.learned),
    prefs: normalizePrefs(raw.prefs, rawVersion),
    reminders: Array.isArray(raw.reminders)
      ? raw.reminders.filter(isReminder).map((item) => ({
          ...item,
          done: Boolean(item.done),
          fired: Boolean(item.fired),
        }))
      : [],
    tasks: Array.isArray(raw.tasks)
      ? raw.tasks.filter(isTask).map((item) => ({
          ...item,
          done: Boolean(item.done),
        }))
      : [],
  }
}

function migrateLegacyVault(): MemoryVault | null {
  const fromOldKey = normalizeVault(readRaw(LEGACY_VAULT_KEY))
  if (fromOldKey) return fromOldKey

  const personality = normalizePersonality(readRaw("mitra:personality"))
  const legacyMessages = readRaw("mitra:messages")
  const messages = Array.isArray(legacyMessages)
    ? legacyMessages.filter(isMessage)
    : []
  if (
    messages.length === 0 &&
    personality.name === DEFAULT_PERSONALITY.name
  ) {
    return null
  }
  const conversation = {
    ...emptyConversation(),
    title: titleFromMessages(messages),
    messages,
    updatedAt: messages.at(-1)?.createdAt || Date.now(),
  }
  return {
    version: VAULT_VERSION,
    personality,
    conversations: [conversation],
    activeId: conversation.id,
    notes: [],
    learned: { ...DEFAULT_LEARNED },
    prefs: { ...DEFAULT_PREFS },
    reminders: [],
    tasks: [],
  }
}

export function hasStoredVault() {
  if (typeof window === "undefined") return false
  try {
    return Boolean(window.localStorage.getItem(VAULT_KEY))
  } catch {
    return false
  }
}

export function loadVault(): MemoryVault {
  const stored = normalizeVault(readRaw(VAULT_KEY))
  if (stored) return stored
  const migrated = migrateLegacyVault()
  if (migrated) {
    saveVault(migrated)
    return migrated
  }
  return emptyVault()
}

export function saveVault(vault: MemoryVault) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(VAULT_KEY, JSON.stringify(vault))
}

export function vaultHasChat(vault: MemoryVault) {
  return vault.conversations.some((conversation) => conversation.messages.length > 0)
}

/** Keep an in-progress thread if a later boot/hydrate snapshot is empty. */
export function keepLiveVault(current: MemoryVault, incoming: MemoryVault) {
  if (vaultHasChat(current) && !vaultHasChat(incoming)) return current
  if (vaultHasChat(current) && vaultHasChat(incoming)) {
    const currentCount = current.conversations.reduce(
      (sum, item) => sum + item.messages.length,
      0
    )
    const incomingCount = incoming.conversations.reduce(
      (sum, item) => sum + item.messages.length,
      0
    )
    if (currentCount > incomingCount) return current
  }
  return incoming
}

export function activeConversation(vault: MemoryVault): Conversation {
  return (
    vault.conversations.find((conversation) => conversation.id === vault.activeId) ??
    vault.conversations[0]
  )
}

export function titleFromMessages(messages: ChatMessage[]): string {
  const first = messages.find((message) => message.role === "user")?.content.trim()
  if (!first) return "New conversation"
  const compact = first.replace(/\s+/g, " ")
  return compact.length > 48 ? `${compact.slice(0, 45)}…` : compact
}

export function withActiveMessages(
  vault: MemoryVault,
  messages: ChatMessage[]
): MemoryVault {
  return {
    ...vault,
    conversations: vault.conversations.map((conversation) => {
      if (conversation.id !== vault.activeId) return conversation
      const title =
        conversation.title === "New conversation"
          ? titleFromMessages(messages)
          : conversation.title
      return {
        ...conversation,
        messages,
        title,
        updatedAt: Date.now(),
      }
    }),
  }
}

export function startFreshConversation(vault: MemoryVault): MemoryVault {
  const current = activeConversation(vault)
  const fresh = emptyConversation()
  if (current.messages.length === 0) {
    return {
      ...vault,
      conversations: vault.conversations.map((conversation) =>
        conversation.id === current.id ? fresh : conversation
      ),
      activeId: fresh.id,
    }
  }
  return {
    ...vault,
    conversations: [fresh, ...vault.conversations],
    activeId: fresh.id,
  }
}

export function countStoredMessages(vault: MemoryVault) {
  return vault.conversations.reduce(
    (sum, conversation) => sum + conversation.messages.length,
    0
  )
}

export function toExport(vault: MemoryVault): MayaExport {
  return {
    kind: "maya-memory",
    version: vault.version,
    exportedAt: Date.now(),
    personality: vault.personality,
    conversations: vault.conversations,
    notes: vault.notes,
    learned: vault.learned,
    prefs: vault.prefs,
    reminders: vault.reminders,
    tasks: vault.tasks,
  }
}

export function parseImport(raw: string): MemoryVault {
  let data: unknown
  try {
    data = JSON.parse(raw) as unknown
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  if (data && typeof data === "object" && "kind" in data) {
    const kind = (data as { kind?: unknown }).kind
    if (kind !== "maya-memory" && kind !== "mitra-memory") {
      throw new Error("That file is not a Maya memory pack.")
    }
  }
  const vault = normalizeVault(data)
  if (!vault) throw new Error("That file is not a Maya memory pack.")
  return vault
}

export function downloadVault(vault: MemoryVault) {
  const payload = toExport(vault)
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  })
  const stamp = new Date().toISOString().slice(0, 10)
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `maya-memory-${stamp}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function addNote(vault: MemoryVault, text: string): MemoryVault {
  const cleaned = text.trim()
  if (!cleaned) return vault
  const exists = vault.notes.some(
    (note) => note.text.toLowerCase() === cleaned.toLowerCase()
  )
  if (exists) return vault
  return {
    ...vault,
    notes: [
      { id: newId(), text: cleaned, createdAt: Date.now() },
      ...vault.notes,
    ].slice(0, 100),
  }
}

export function removeNote(vault: MemoryVault, id: string): MemoryVault {
  return {
    ...vault,
    notes: vault.notes.filter((note) => note.id !== id),
  }
}

export function upsertReminder(vault: MemoryVault, reminder: Reminder): MemoryVault {
  return {
    ...vault,
    reminders: [reminder, ...vault.reminders.filter((item) => item.id !== reminder.id)].slice(
      0,
      40
    ),
  }
}

export function patchReminder(
  vault: MemoryVault,
  id: string,
  patch: Partial<Reminder>
): MemoryVault {
  return {
    ...vault,
    reminders: vault.reminders.map((item) =>
      item.id === id ? { ...item, ...patch } : item
    ),
  }
}

export function upsertTask(vault: MemoryVault, task: TaskItem): MemoryVault {
  return {
    ...vault,
    tasks: [task, ...vault.tasks.filter((item) => item.id !== task.id)].slice(0, 40),
  }
}

export function patchTask(
  vault: MemoryVault,
  id: string,
  patch: Partial<TaskItem>
): MemoryVault {
  return {
    ...vault,
    tasks: vault.tasks.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  }
}

export function removeTask(vault: MemoryVault, id: string): MemoryVault {
  return {
    ...vault,
    tasks: vault.tasks.filter((item) => item.id !== id),
  }
}

export function removeConversation(
  vault: MemoryVault,
  id: string
): MemoryVault {
  if (vault.conversations.length <= 1) return startFreshConversation(vault)
  const next = vault.conversations.filter((conversation) => conversation.id !== id)
  const activeId =
    vault.activeId === id ? next[0].id : vault.activeId
  return { ...vault, conversations: next, activeId }
}
