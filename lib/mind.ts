import { newId } from "@/lib/id"

export type FactKind = "preference" | "fact" | "mention" | "goal"
export type FactSource = "conversation" | "user" | "lookup" | "inferred"

export type MindFact = {
  id: string
  text: string
  kind: FactKind
  confidence: number
  source: FactSource
  lastConfirmed: number
  mentions: number
}

export type PlanStep = {
  id: string
  text: string
  done: boolean
}

export type MindPlan = {
  id: string
  goal: string
  steps: PlanStep[]
  createdAt: number
  updatedAt: number
}

export type Presence =
  | "idle"
  | "listening"
  | "thinking"
  | "searching"
  | "executing"
  | "speaking"
  | "error"

export type MindAction =
  | "remember"
  | "forget"
  | "today"
  | "plan"
  | "continue"
  | "analyze"
  | "skills"
  | "audit"

export type MindAsk = {
  action: MindAction
  query: string
}

export const MAYA_SKILLS: Array<{
  id: string
  label: string
  description: string
  network: boolean
  confirm: boolean
  permission: "internet" | "files" | "python" | "google" | "screen" | "none"
}> = [
  { id: "weather", label: "Weather", description: "Live weather for a city", network: true, confirm: false, permission: "internet" },
  { id: "news", label: "News", description: "Local, national, and world headlines", network: true, confirm: false, permission: "internet" },
  { id: "maps", label: "Maps", description: "Google Maps links. She does not drive Chrome", network: true, confirm: false, permission: "internet" },
  { id: "otaku", label: "Otaku shelf", description: "Official manga, novel, and episode links", network: true, confirm: false, permission: "internet" },
  { id: "lookup", label: "Web lookup", description: "DuckDuckGo, Wikipedia, public GitHub", network: true, confirm: false, permission: "internet" },
  { id: "calc", label: "Calculator", description: "Local expressions. No Python confirm", network: false, confirm: false, permission: "none" },
  { id: "music", label: "Music", description: "YouTube play links in the Music dock", network: true, confirm: false, permission: "internet" },
  { id: "flute", label: "Flute", description: "Lessons, sargam, pitch from a clip", network: false, confirm: false, permission: "none" },
  { id: "python", label: "Python", description: "Sandbox in data/workspace, 8s", network: false, confirm: true, permission: "python" },
  { id: "files", label: "Files", description: "Read always. Writes stay in the sandbox", network: false, confirm: true, permission: "files" },
  { id: "google", label: "Google apps", description: "Calendar, Gmail, Drive, Docs, Sheets, Tasks, Contacts", network: true, confirm: true, permission: "google" },
  { id: "screen", label: "Screen still", description: "Stores pixels. No vision model unless you add one", network: false, confirm: true, permission: "screen" },
  { id: "reminders", label: "Reminders", description: "Fire in this tab, not the phone Clock app", network: false, confirm: false, permission: "none" },
  { id: "mind", label: "Mind", description: "Facts with confidence, plans, Analysis Chamber", network: false, confirm: false, permission: "none" },
]

export function isMindFact(value: unknown): value is MindFact {
  if (!value || typeof value !== "object") return false
  const item = value as MindFact
  return typeof item.id === "string" && typeof item.text === "string" && typeof item.confidence === "number"
}

export function isMindPlan(value: unknown): value is MindPlan {
  if (!value || typeof value !== "object") return false
  const item = value as MindPlan
  return typeof item.id === "string" && typeof item.goal === "string" && Array.isArray(item.steps)
}

export function formatFactLine(fact: MindFact) {
  const pct = Math.round(fact.confidence * 100)
  return `${fact.kind} (${pct}%): ${fact.text}`
}

export function formatPlanLine(plan: MindPlan) {
  const done = plan.steps.filter((step) => step.done).length
  return `${plan.goal} — ${done}/${plan.steps.length} steps`
}

export function isMindQuery(text: string) {
  const lower = text.toLowerCase()
  if (
    /\b(analyze|analyse|summarise|summarize)\b/.test(lower) &&
    /\b(csv|tsv|json|python|sandbox|\.py\b|file|data)\b/.test(lower)
  ) {
    return false
  }
  return (
    /\b(what do you (remember|know) about me|what do you remember|show (me )?your (memory|mind)|your facts)\b/.test(
      lower
    ) ||
    /\b(forget (that|this|it)|forget that i|stop remembering|delete (that|this) (fact|memory))\b/.test(
      lower
    ) ||
    /\b(what am i (supposed to do|doing) today|what(?:'s| is) on (my )?(plate|agenda) today)\b/.test(
      lower
    ) ||
    /\b(make a plan|plan my|plan a|continue the plan|continue (my )?plan|next step in the plan)\b/.test(
      lower
    ) ||
    /^(plan|analyse|analyze)\b/.test(lower) ||
    /\b(analyze whether|analyse whether|analysis chamber|should i (buy|get|take|learn|do|move|quit))\b/.test(
      lower
    ) ||
    /\b(what (skills|tools) do you have|inspect your skills)\b/.test(
      lower
    ) ||
    /\b(what did you (access|do|run|use)( today)?|audit log|what did i access)\b/.test(
      lower
    )
  )
}

export function mindAsk(text: string): MindAsk {
  const lower = text.toLowerCase()
  if (/\bforget\b/.test(lower)) return { action: "forget", query: text }
  if (
    /\b(what do you (remember|know)|show (me )?your (memory|mind)|your facts)\b/.test(
      lower
    )
  ) {
    return { action: "remember", query: text }
  }
  if (
    /\b(what am i (supposed to do|doing) today|on (my )?(plate|agenda) today|good morning)\b/.test(
      lower
    )
  ) {
    return { action: "today", query: text }
  }
  if (/\b(continue (the |my )?plan|next step in the plan)\b/.test(lower)) {
    return { action: "continue", query: text }
  }
  if (
    /\b(analyze|analyse|analysis chamber|should i (buy|get|take|learn|do|move|quit))\b/.test(
      lower
    )
  ) {
    return { action: "analyze", query: text }
  }
  if (/\b(what (skills|tools) do you have|inspect your skills)\b/.test(lower)) {
    return { action: "skills", query: text }
  }
  if (/\b(what did you (access|do|run|use)|audit log|what did i access)\b/.test(lower)) {
    return { action: "audit", query: text }
  }
  return { action: "plan", query: text }
}

export function upsertFact(list: MindFact[], incoming: Omit<MindFact, "id"> & { id?: string }) {
  const needle = incoming.text.toLowerCase().replace(/\s+/g, " ").trim()
  const existing = list.find(
    (item) =>
      item.text.toLowerCase().replace(/\s+/g, " ").trim() === needle ||
      (needle.length > 12 && item.text.toLowerCase().includes(needle.slice(0, 24)))
  )
  if (existing) {
    const mentions = existing.mentions + 1
    const confidence = Math.min(0.95, existing.confidence + 0.08)
    const next: MindFact = {
      ...existing,
      mentions,
      confidence,
      lastConfirmed: Date.now(),
      kind: existing.kind === "mention" && incoming.kind !== "mention" ? incoming.kind : existing.kind,
      source: incoming.source === "user" ? "user" : existing.source,
    }
    return [next, ...list.filter((item) => item.id !== existing.id)].slice(0, 80)
  }
  const created: MindFact = {
    id: incoming.id || newId(),
    text: incoming.text.trim(),
    kind: incoming.kind,
    confidence: incoming.confidence,
    source: incoming.source,
    lastConfirmed: incoming.lastConfirmed || Date.now(),
    mentions: incoming.mentions || 1,
  }
  return [created, ...list].slice(0, 80)
}

export function factsFromUtterance(text: string): MindFact[] {
  const source = text.trim()
  const now = Date.now()
  const found: MindFact[] = []
  const add = (kind: FactKind, confidence: number, raw: string) => {
    const clipped = raw.replace(/\s+/g, " ").trim().slice(0, 140)
    if (clipped.length < 8) return
    found.push({
      id: newId(),
      text: clipped,
      kind,
      confidence,
      source: "conversation",
      lastConfirmed: now,
      mentions: 1,
    })
  }
  const prefer = source.match(
    /\b(?:i (?:prefer|like|love|always|usually)|i don't like|i do not like|i hate)\s+([^.,!?\n]{3,80})/i
  )
  if (prefer?.[0]) add("preference", 0.82, prefer[0])
  const live = source.match(
    /\b(?:i live in|i'm from|i am from|i'm based in|i am based in)\s+([^.,!?\n]{2,60})/i
  )
  if (live?.[0]) add("fact", 0.88, live[0])
  const work = source.match(/\b(?:i work (?:as|at|in)|i study|my skills? (?:are|is))\s+([^.,!?\n]{2,80})/i)
  if (work?.[0]) add("fact", 0.8, work[0])
  const goal = source.match(
    /\b(?:i (?:want to|need to|am trying to|gonna|going to)|my (?:goal|mission) is to)\s+([^.,!?\n]{3,80})/i
  )
  if (goal?.[0]) add("goal", 0.7, goal[0])
  if (!found.length && /\b(i (?:have|got|use|own)|my )\b/i.test(source) && source.length < 120) {
    add("mention", 0.42, source)
  }
  return found
}

export function forgetFacts(list: MindFact[], query: string) {
  const needle = query
    .toLowerCase()
    .replace(/\b(forget( that)?|stop remembering|delete (that|this) (fact|memory)|please)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (needle.length < 2) return { kept: list, removed: [] as MindFact[] }
  const removed: MindFact[] = []
  const kept = list.filter((item) => {
    const hit =
      item.text.toLowerCase().includes(needle) ||
      needle.includes(item.text.toLowerCase().slice(0, 20))
    if (hit) removed.push(item)
    return !hit
  })
  return { kept, removed }
}

export function defaultPlanSteps(goal: string): string[] {
  const g = goal.toLowerCase()
  if (/\b(trip|travel|meghalaya|vacation|holiday|flight)\b/.test(g)) {
    return [
      "Research travel days and constraints",
      "Check weather for the dates",
      "Sketch a route / itinerary",
      "Estimate budget (travel, stay, food)",
      "Packing list",
      "Hold the open questions — do not invent bookings",
    ]
  }
  if (/\b(learn|study|course|kubernetes|exam)\b/.test(g)) {
    return [
      "Name the current level (what is already solid)",
      "Pick the next thin slice to learn",
      "Find one official or honest source",
      "Schedule the first practice block",
      "Decide how you will know it stuck",
    ]
  }
  if (/\b(buy|purchase|laptop|phone)\b/.test(g)) {
    return [
      "Write the real requirements and budget",
      "List current hardware and the gap",
      "Compare two or three real options (no invented prices)",
      "Risks and longevity",
      "Verdict: buy, wait, or reject",
    ]
  }
  return [
    "State the goal in one sentence",
    "List what is already true",
    "Name the missing facts — do not invent them",
    "First useful action",
    "How we will know it is done",
  ]
}

export function makePlan(goal: string): MindPlan {
  const clean = goal
    .replace(/^(plan( my| a| the)?|make a plan( for| to)?)\s+/i, "")
    .replace(/[?.!]+$/g, "")
    .trim() || "Untitled plan"
  const now = Date.now()
  return {
    id: newId(),
    goal: clean.slice(0, 120),
    steps: defaultPlanSteps(clean).map((text) => ({
      id: newId(),
      text,
      done: false,
    })),
    createdAt: now,
    updatedAt: now,
  }
}

export function continuePlan(plan: MindPlan): { plan: MindPlan; line: string } {
  const next = plan.steps.find((step) => !step.done)
  if (!next) {
    return {
      plan,
      line: `Plan “${plan.goal}” is complete. ${plan.steps.length}/${plan.steps.length} steps done.`,
    }
  }
  const updated: MindPlan = {
    ...plan,
    steps: plan.steps.map((step) =>
      step.id === next.id ? { ...step, done: true } : step
    ),
    updatedAt: Date.now(),
  }
  const done = updated.steps.filter((step) => step.done).length
  const remaining = updated.steps.find((step) => !step.done)
  return {
    plan: updated,
    line: `Marked done: ${next.text}\n${done}/${updated.steps.length} complete.${
      remaining ? `\nNext: ${remaining.text}` : "\nThat was the last step."
    }`,
  }
}

export function renderChamber(objective: string, extras: {
  facts?: MindFact[]
  notes?: string[]
  evidence?: string[]
}) {
  const known = [
    ...(extras.facts ?? []).slice(0, 6).map((fact) => formatFactLine(fact)),
    ...(extras.notes ?? []).slice(0, 4),
  ]
  const evidence = extras.evidence?.length
    ? extras.evidence.slice(0, 6)
    : ["No live lookup on this turn. I will not invent a price, spec, or review."]
  const missing = known.length
    ? "If a number or spec is not above, it is unknown."
    : "Budget, current hardware, and must-haves are unknown unless you state them."
  return [
    "ANALYSIS CHAMBER",
    "",
    `Objective`,
    `→ ${objective.replace(/[?.!]+$/g, "").trim() || "Decide the next honest move"}`,
    "",
    "What I actually know",
    known.length ? known.map((line) => `→ ${line}`).join("\n") : "→ I do not actually know the constraints yet.",
    "",
    "Evidence",
    evidence.map((line) => `→ ${line}`).join("\n"),
    "",
    "Risks",
    "→ Acting on a guess. I would rather wait than invent.",
    "",
    "Gaps",
    `→ ${missing}`,
    "",
    "Verdict",
    "→ WAIT until the missing facts are yours, not mine. I can look up public pages if you name the model or place. I will not fabricate a BUY.",
  ].join("\n")
}

export function renderSage(body: string) {
  return body.trim()
}

/** Drop Assessment / Answer / tool-name headers so the reply reads like a person. */
export function stripSageChrome(text: string) {
  return text
    .replace(
      /^Assessment\s*\r?\nI used what I actually have[^\n]*\r?\n+(?:Answer\s*\r?\n)?/i,
      ""
    )
    .replace(/^Assessment\s*\r?\n[\s\S]*?\r?\nAnswer\s*\r?\n/i, "")
    .replace(/^Here is what I actually ran[^\n]*\r?\n+/i, "")
    .replace(/^I used the tools on this machine:\s*/i, "")
    .replace(
      /^(maps|music|weather|news|calc|otaku|flute|lookup|files_read|files_list|files_write|python|google_\w+|recall|mind):\s*/gim,
      ""
    )
    .replace(/^(Assessment|Answer)\s*:?\s*$/gim, "")
    .trim()
}

export function renderRemember(facts: MindFact[], notes: string[]) {
  if (!facts.length && !notes.length) {
    return [
      "I do not actually know much about you yet.",
      "A mention in passing is not a fact. Tell me something on purpose — where you live, what you prefer, a goal — and I will store it with a confidence score.",
      "I will not invent a CV.",
    ].join("\n\n")
  }
  const groups: Record<FactKind, MindFact[]> = {
    preference: [],
    fact: [],
    goal: [],
    mention: [],
  }
  for (const fact of facts) groups[fact.kind].push(fact)
  const block = (label: string, rows: MindFact[]) => {
    if (!rows.length) return ""
    return `${label}\n${rows
      .slice(0, 8)
      .map(
        (fact) =>
          `• ${fact.text}  (${Math.round(fact.confidence * 100)}%, ${fact.source}, ×${fact.mentions})`
      )
      .join("\n")}`
  }
  const leftover = notes
    .filter((note) => !facts.some((fact) => note.toLowerCase().includes(fact.text.toLowerCase().slice(0, 18))))
    .slice(0, 6)
  return [
    "This is what I actually hold. Confidence is not certainty.",
    block("Preferences", groups.preference),
    block("Facts", groups.fact),
    block("Goals", groups.goal),
    block("Mentions (said once — not treated as settled)", groups.mention),
    leftover.length ? `Loose notes\n${leftover.map((note) => `• ${note}`).join("\n")}` : "",
    "Say “forget that I live in Hyderabad” and I will drop that fact. I do not know what I did not store.",
  ]
    .filter(Boolean)
    .join("\n\n")
}

export function renderToday(input: {
  reminders: string[]
  tasks: string[]
  plans: MindPlan[]
}) {
  const openPlans = input.plans.filter((plan) => plan.steps.some((step) => !step.done))
  const bits = [
    ...input.reminders.slice(0, 5),
    ...input.tasks.slice(0, 5),
    ...openPlans.map((plan) => {
      const next = plan.steps.find((step) => !step.done)
      return `${formatPlanLine(plan)}${next ? ` — next: ${next.text}` : ""}`
    }),
  ]
  if (!bits.length) {
    return "Nothing is waiting that I actually stored. No invented agenda."
  }
  return [
    "What is actually waiting — not a vibe.",
    ...bits.map((line, i) => `${String(i + 1).padStart(2, "0")}  ${line}`),
    "I do not run work in the background unless you left this tab open for a reminder.",
  ].join("\n")
}

export function renderSkills() {
  return [
    "Skills I can actually use. I do not discover new ones by wishing.",
    ...MAYA_SKILLS.map(
      (skill) =>
        `• ${skill.label} — ${skill.description}${skill.confirm ? " (asks first)" : ""}${
          skill.network ? " (needs the net)" : ""
        }`
    ),
    "Screen stills are stored. I cannot see pixels without a vision model — describe them, or wait until we add one locally.",
  ].join("\n")
}

export function renderPlan(plan: MindPlan, extra?: string) {
  const done = plan.steps.filter((step) => step.done).length
  const steps = plan.steps
    .map((step, i) => `${step.done ? "●" : "○"}  ${i + 1}. ${step.text}`)
    .join("\n")
  return [
    extra,
    `GOAL\n└── ${plan.goal}`,
    "",
    `TASKS  ${done} / ${plan.steps.length}`,
    steps,
    "",
    "Say “continue the plan” for the next step. I will not book flights or invent prices.",
  ]
    .filter(Boolean)
    .join("\n")
}

export async function runMind(input: {
  ask: MindAsk
  facts: MindFact[]
  notes: string[]
  reminders: string[]
  tasks: string[]
  plans: MindPlan[]
  auditLines?: string[]
}): Promise<{
  text: string
  facts?: MindFact[]
  removed?: MindFact[]
  plan?: MindPlan
}> {
  if (input.ask.action === "remember") {
    return { text: renderRemember(input.facts, input.notes) }
  }
  if (input.ask.action === "forget") {
    const { kept, removed } = forgetFacts(input.facts, input.ask.query)
    return {
      text: removed.length
        ? `Forgotten:\n${removed.map((fact) => `• ${fact.text}`).join("\n")}\n\nI will not bring those back unless you tell me again.`
        : "I do not have a stored fact that matches that. Nothing to drop.",
      facts: kept,
      removed,
    }
  }
  if (input.ask.action === "today") {
    return { text: renderToday(input) }
  }
  if (input.ask.action === "skills") {
    return { text: renderSkills() }
  }
  if (input.ask.action === "audit") {
    const lines = input.auditLines ?? []
    if (!lines.length) {
      return { text: "Nothing is on the audit log yet. I do not invent activity." }
    }
    return {
      text: ["What I actually accessed — not a vibe.", ...lines].join("\n"),
    }
  }
  if (input.ask.action === "analyze") {
    const objective = input.ask.query
      .replace(/^(analyze|analyse)( whether| if)?\s+/i, "")
      .trim()
    return {
      text: renderChamber(objective, {
        facts: input.facts,
        notes: input.notes,
      }),
    }
  }
  if (input.ask.action === "continue") {
    const plan = input.plans[0]
    if (!plan) {
      return { text: "No open plan. Say “plan my weekend” (or a real goal) first." }
    }
    const next = continuePlan(plan)
    return { text: renderPlan(next.plan, next.line), plan: next.plan }
  }
  const plan = makePlan(input.ask.query)
  return { text: renderPlan(plan), plan }
}

export const PRESENCE_LABEL: Record<Presence, string> = {
  idle: "Present",
  listening: "Listening",
  thinking: "Thinking",
  searching: "Searching",
  executing: "Using a tool",
  speaking: "Speaking",
  error: "Stuck",
}
