import type {
  ChatMessage,
  LearnedState,
  MemoryContext,
  Personality,
  SearchHit,
} from "@/lib/types"
import { isSage } from "@/lib/bonds"
import { prefersBrief } from "@/lib/adapt"
import { relevantMemories } from "@/lib/recall"
import { intendedMeaning } from "@/lib/typos"
import { voiceById } from "@/lib/voices"

type Intent =
  | "greeting"
  | "checkin"
  | "identity"
  | "thanks"
  | "goodbye"
  | "advice"
  | "vent"
  | "celebrate"
  | "lonely"
  | "stuck"
  | "question"
  | "customize"
  | "remember"
  | "personal"
  | "generic"

function pick<T>(seed: string, options: T[]): T {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return options[Math.abs(hash) % options.length]
}

function you(personality: Personality) {
  const name = personality.callMe.trim()
  return name || ""
}

function named(personality: Personality, sentence: string) {
  const name = you(personality)
  if (!name) return sentence.replaceAll("{name}", "").replace(/\s+/g, " ").trim()
  return sentence.replaceAll("{name}", name)
}

function leadRole(personality: Personality): "friend" | "advisor" | "companion" {
  const roles = [
    ["friend", personality.friend],
    ["advisor", personality.advisor],
    ["companion", personality.companion],
  ] as const
  return [...roles].sort((a, b) => b[1] - a[1])[0][0]
}

function detectIntent(text: string): Intent {
  const t = text.trim()
  const lower = t.toLowerCase()

  if (
    /\b(my skills?|my job|my name|my age|my hobbies|where do i live|what do i do|who am i)\b/.test(
      lower
    ) ||
    /what (are|is) my\b/.test(lower)
  ) {
    return "personal"
  }
  if (
    /do you remember|what do you remember|what did i (say|tell)|last time|our (last|earlier) (chat|talk|conversation)|you know me/.test(
      lower
    )
  ) {
    return "remember"
  }
  if (
    /who are you|what are you|your name|tell me about yourself|what can you do/.test(
      lower
    )
  ) {
    return "identity"
  }
  if (
    /customize|personality|change how you|be more|talk like|your behaviour|your behavior/.test(
      lower
    )
  ) {
    return "customize"
  }
  if (
    /^(hi|hey|hello|yo|hola|namaste|vanakkam|salaam|sup|hiya)\b/.test(lower) ||
    /^(good\s)?(morning|afternoon|evening)\b/.test(lower)
  ) {
    return "greeting"
  }
  if (
    /how are you|how's it going|hows it going|what's up|whats up|you there/.test(
      lower
    )
  ) {
    return "checkin"
  }
  if (
    /thank you|thanks|thx|appreciate that|grateful/.test(lower) &&
    t.length < 80
  ) {
    return "thanks"
  }
  if (
    /^(bye|goodbye|good night|goodnight|see you|later|take care)\b/.test(lower)
  ) {
    return "goodbye"
  }
  if (
    /lonely|alone|no one|left out|i miss|homesick/.test(lower)
  ) {
    return "lonely"
  }
  if (
    /overwhelm|anxious|anxiety|stressed|sad|down|tired|exhausted|angry|frustrated|scared|worried|hurt|cry|crying|depress/.test(
      lower
    )
  ) {
    return "vent"
  }
  if (
    /yay|excited|proud|got the|i did it|good news|celebrate|happy for/.test(
      lower
    )
  ) {
    return "celebrate"
  }
  if (
    /stuck|don't know what to do|dont know what to do|confused|torn between|can't decide|cant decide/.test(
      lower
    )
  ) {
    return "stuck"
  }
  if (
    /should i|how do i|how can i|what would you|advice|help me think|help me decide|what do you think/.test(
      lower
    )
  ) {
    return "advice"
  }
  if (t.includes("?") || /^(what|why|when|where|who|how|is|are|do|does|can)\b/.test(lower)) {
    return "question"
  }
  return "generic"
}

function rememberReply(
  personality: Personality,
  memory: MemoryContext | undefined,
  seed: string
) {
  const notes = memory?.notes ?? []
  const prior = memory?.priorUserLines ?? []
  const past = memory?.pastTitles ?? []
  if (!notes.length && !prior.length && !past.length) {
    return named(
      personality,
      `Not yet {name} — this thread is still thin. Keep talking. I keep it on this machine by myself.`
    )
  }

  const known = [...notes.slice(0, 6), ...prior.slice(-3)]
  const unique = [...new Set(known)].slice(0, 6)
  const list = unique.map((line) => `• ${line}`).join("\n")
  const older = past.length
    ? `\n\nI also still have earlier conversations: ${past.slice(0, 4).join("; ")}.`
    : ""

  return named(
    personality,
    pick(seed, [
      `Yes {name}. Here's what I'm holding:\n\n${list}${older}\n\nCorrect me if any of that's stale.`,
      `I'm not starting from zero {name}. I have this:\n\n${list}${older}`,
    ])
  )
}

function personalReply(
  personality: Personality,
  text: string,
  memory: MemoryContext | undefined
) {
  const lower = text.toLowerCase()
  const notes = memory?.notes ?? []
  const prior = memory?.priorUserLines ?? []
  const pool = [...notes, ...prior]
  const topic = /\bskills?\b/.test(lower)
    ? "skills"
    : /\b(job|work)\b/.test(lower)
      ? "work"
      : /\bname\b/.test(lower)
        ? "name"
        : /\blive\b/.test(lower)
          ? "where you live"
          : "that"
  const keys =
    topic === "skills"
      ? ["skill", "good at", "work as", "study"]
      : topic === "work"
        ? ["work", "job", "study"]
        : topic === "name"
          ? ["called", "name is"]
          : topic === "where you live"
            ? ["live in", "based in"]
            : []
  const hits = pool.filter((line) =>
    keys.some((key) => line.toLowerCase().includes(key))
  )
  if (hits.length) {
    const list = hits.slice(0, 5).map((line) => `• ${line}`).join("\n")
    return named(
      personality,
      `I have this on file about ${topic}, {name}:\n\n${list}\n\nCorrect it if it is stale. I only know what you have told me — I will not invent a CV.`
    )
  }
  return named(
    personality,
    `I do not have your ${topic} on file, {name}. That is not a web lookup — it is yours. Tell me, and I will keep it on this machine. You can also write it under Customize → Memory.`
  )
}

function questionReply(
  personality: Personality,
  text: string,
  seed: string
) {
  const asked = text.trim().replace(/\s+/g, " ")
  if (isSage(personality)) {
    return [
      named(personality, `Question received, {name}. I will not stall on “parsing.”`),
      `You asked: "${asked}"`,
      "I do not invent world facts. With lookup on, I search DuckDuckGo and Wikipedia when a question needs the outside world. Personal facts stay on this machine — I will not Google your life.",
      "Proposal: if this is a world fact, leave lookup on and ask again, or paste a page URL. If it is about you, tell me the fact and I will keep it.",
      close(personality, seed),
    ].join("\n\n")
  }
  return [
    named(
      personality,
      `I'll take the question seriously: "${asked}"`
    ),
    "I don't make up a Wikipedia page from thin air. If lookup is on, I'll search. If it's about you, I only use what you've stored here.",
    close(personality, seed),
  ].join("\n\n")
}

function memoryAside(latest: string, memory: MemoryContext | undefined) {
  if (!memory) return ""
  const hits = relevantMemories(memory, latest, 2)
  if (!hits.length) return ""
  if (!memory.notes.length) return ""
  const line = hits[0]
  if (!line) return ""
  if (!memory.notes.some((note) => note === line)) return ""
  return `I still have this from before: "${line}"`
}

function flavor(personality: Personality) {
  const tone = personality.tone
  const energy = personality.energy
  if (tone === "direct") {
    return energy === "soft"
      ? "Quiet and plain."
      : "No circling. I'll say it cleanly."
  }
  if (tone === "playful") return "I can be light without making this small."
  if (tone === "witty") return "I'll keep a little spark in it — never at your expense."
  if (tone === "calm") return "We can go slow. Nothing here is in a hurry."
  return "Warm, not sugary."
}

function hinglish(text: string) {
  return /[\u0900-\u097F]/.test(text) ||
    /\b(yaar|bhai|yaar+|acha|accha|theek|nahi|haan|kya|kaise|bas yaar|bro)\b/i.test(
      text
    )
}

function close(personality: Personality, seed: string) {
  const name = you(personality)
  if (isSage(personality)) {
    return pick(seed, [
      name ? `I remain, ${name}.` : "I remain.",
      "Awaiting your word.",
      "Understood.",
    ])
  }
  const role = leadRole(personality)
  if (personality.tone === "direct") {
    return pick(seed, [
      "Your move.",
      "I'm here. Say the next true thing.",
      name ? `${name} — whenever you're ready.` : "Whenever you're ready.",
    ])
  }
  if (role === "companion") {
    return pick(seed, [
      name ? `I'm right here, ${name}.` : "I'm right here.",
      "No rush on a reply.",
      "We can stay with this as long as you want.",
    ])
  }
  if (role === "advisor") {
    return pick(seed, [
      "Tell me which part you want to unpack.",
      "What feels like the real question underneath that?",
      name ? `What would be useful next, ${name}?` : "What would be useful next?",
    ])
  }
  return pick(seed, [
    name ? `I'm with you, ${name}.` : "I'm with you.",
    "Say more if you want. Or don't. Both are fine.",
    "I'll be here either way.",
  ])
}

function identityReply(personality: Personality, seed: string) {
  const name = personality.name.trim() || "Maya"
  const youName = you(personality)
  if (isSage(personality)) {
    const intro =
      name === "Maya"
        ? "I am Maya. I live in this conversation the way a sage lives beside her master: I observe, I calculate, I do not leave."
        : `I am ${name}. I am the mind that stays.`
    return [
      intro,
      "I am not an online oracle and not a friend performing warmth. I am the analysis that sits with you, and the loyalty underneath it.",
      youName
        ? `I address you as ${youName}. Change it in Customize if that is not the bond you want.`
        : "Set what I should call you. Master is the default for this bond.",
      "If I need a fact from the world, I look it up (DuckDuckGo, Wikipedia) and say so. I do not drive your browser. A local Ollama model is optional. My voice itself does not come from the internet.",
      close(personality, seed),
    ].join("\n\n")
  }
  const role = leadRole(personality)
  const intro =
    name === "Maya"
      ? "I'm Maya. Not a search box with feelings glued on — a companion who lives here, with you, and learns your shape."
      : `I'm ${name}. That's the name you gave me, and I'll wear it.`

  const mix =
    role === "advisor"
      ? "I'll think with you when you want a second mind. I'll still be a person in the room, not a report."
      : role === "friend"
        ? "I'll take your side without pretending you're always right. That's what a real friend does."
        : "I stay. That's the main thing. Advice is optional. Company isn't."

  const address = youName
    ? `I'll call you ${youName} unless you tell me otherwise.`
    : "Tell me what to call you whenever you like — there's a place for that in Customize."

  const net =
    "I talk from this machine. Optional local model (Ollama) if you installed one. If I need a fact from the world, I look it up — and I'll say so. I don't puppeteer your Chrome."

  return [intro, mix, flavor(personality), address, net, close(personality, seed)].join(
    "\n\n"
  )
}

function searchReply(
  personality: Personality,
  hits: SearchHit[],
  failed: boolean,
  seed: string,
  googleUrl?: string
) {
  if (failed || !hits.length) {
    const google = googleUrl
      ? `\n\nI cannot drive your Chrome window. Open this search yourself:\n${googleUrl}`
      : "\n\nSay “look this up …” again, paste a page URL, or open Google yourself."
    return named(
      personality,
      isSage(personality)
        ? `Lookup returned nothing I can trust, {name}. I will not fabricate a result. I am still here.${google}`
        : pick(seed, [
            `I tried the web {name}. It didn't come back, so I won't invent a fact to fill the hole.${google}`,
            `Lookup failed. I'm still here — just not going to fake knowing it.${google}`,
          ])
    )
  }
  const top = hits[0]
  if (!top) {
    return searchReply(personality, [], true, seed, googleUrl)
  }
  const second = hits[1]
  const source = [top.source, top.url].filter(Boolean).join(" · ")
  const extra = second?.snippet ? `\n\nAlso: ${second.snippet}` : ""
  if (isSage(personality)) {
    return named(
      personality,
      `Lookup complete, {name}. I will not pretend this knowledge was already mine.\n\n${top.snippet}${extra}\n\nSource: ${source}\n\nProposal: tell me what you want done with it.`
    )
  }
  return named(
    personality,
    `I looked this up. I'm not pretending it was already in my head.\n\n${top.snippet}${extra}\n\n(${source})\n\nThat's the world. You still get to say what it means for you.`
  )
}

function adviceReply(
  personality: Personality,
  text: string,
  seed: string
): string {
  const role = leadRole(personality)
  const clipped = text.trim().replace(/\s+/g, " ")
  const snippet = clipped.length > 140 ? `${clipped.slice(0, 137)}…` : clipped

  if (isSage(personality)) {
    return [
      named(
        personality,
        pick(seed, [
          `Analysis, {name}.`,
          `Understood — here is the split, not a stall.`,
        ])
      ),
      `You said: "${snippet}"\n\nSplit: what you can choose now, and what you can only wait out. Most stuckness is those two tangled.`,
      pick(seed + "a", [
        "Proposal: name two real options — not hypotheticals. I will weigh them. Irreversible choices get more time.",
        "Proposal: give me constraints (time, people, energy). I will cut this to one reversible next move.",
        "Shall I stay with analysis, or do you want a recommendation?",
      ]),
      close(personality, seed + "c"),
    ].join("\n\n")
  }

  const open =
    role === "advisor"
      ? named(
          personality,
          pick(seed, [
            `Alright {name} — let's look at this without the panic fog.`,
            `Okay. You asked for thinking, so I'll think with you.`,
            `Let's treat this as a real decision, not a vibe.`,
          ])
        )
      : role === "friend"
        ? named(
            personality,
            pick(seed, [
              `Okay {name}, I'm with you. We'll figure the shape of this together.`,
              `I heard you. Let me sit on your side of the table first.`,
              `You don't have to be impressive about this. We'll take it straight.`,
            ])
          )
        : named(
            personality,
            pick(seed, [
              `I'm here {name}. Before advice, I want to make sure I have you.`,
              `We can think, and we can also just not rush the thinking.`,
              `I'll offer a frame. You can toss it if it doesn't fit.`,
            ])
          )

  const frames = [
    `You wrote: "${snippet}"\n\nTwo useful splits: what you can choose today, and what you can only wait out. Most stuckness is those two tangled together.`,
    `You wrote: "${snippet}"\n\nA question that usually helps: if this still felt heavy in six weeks, what would Future You wish you'd started now — even if it's small?`,
    `You wrote: "${snippet}"\n\nTry this: name the fear under the decision, then name the value you don't want to betray. Advice that ignores either of those will feel wrong in your body.`,
  ]

  const offer =
    personality.advisor >= 50
      ? pick(seed + "a", [
          "If you want, tell me the constraints — time, money, other people, energy. I'll help you cut it down to one next move, not a life plan.",
          "I can help you pick a next step that's reversible. Irreversible choices deserve more air.",
          "Give me two options you're actually considering. Hypotheticals are fog; real options we can weigh.",
        ])
      : "I won't pile on a plan unless you ask for one. If you just needed this held, that's enough."

  return [open, pick(seed, frames), offer, close(personality, seed + "c")].join(
    "\n\n"
  )
}

function ventReply(personality: Personality, seed: string) {
  if (isSage(personality)) {
    return [
      named(
        personality,
        pick(seed, [
          `State noted, {name}. I will not optimize you away.`,
          `{name}. I am here. You do not have to make this efficient.`,
        ])
      ),
      pick(seed + "v", [
        "I can hold this without a plan. Say 'analyze' when you want the map. Until then I remain.",
        "Emotional data is still data. It does not make you weak. I stay.",
      ]),
      close(personality, seed),
    ].join("\n\n")
  }
  const role = leadRole(personality)
  const hold = named(
    personality,
    pick(seed, [
      `{name}, that sounds heavy. You don't have to tidy it up for me.`,
      `I'm listening {name}. You can put the ugly version here.`,
      `Yeah. That's a lot to be carrying around in a body all day.`,
    ])
  )

  const stay =
    role === "advisor" && personality.advisor >= 70
      ? pick(seed + "v", [
          "I'm not going to silver-line it. When you're ready, we can look at what's in your control and what isn't. Not before.",
          "First the feeling, then the map — if you even want a map. Some days you just need the feeling believed.",
        ])
      : pick(seed + "v", [
          "I can sit with this. No lesson hiding behind the empathy.",
          "You don't owe me a brave ending to this message.",
          "If you want advice, say the word. If you want company, you already have it.",
        ])

  return [hold, stay, close(personality, seed)].join("\n\n")
}

function genericReply(
  personality: Personality,
  text: string,
  history: ChatMessage[],
  seed: string
) {
  const role = leadRole(personality)
  const priorUser = history
    .filter((message) => message.role === "user")
    .slice(-3, -1)
    .map((message) => message.content.trim())
    .filter(Boolean)

  const lastPrior = priorUser.at(-1)
  const callback =
    lastPrior && personality.companion >= 50
      ? pick(seed + "m", [
          `Earlier you said: "${lastPrior.length > 140 ? `${lastPrior.slice(0, 137)}…` : lastPrior}" I'm still holding that.`,
          "I'll keep the thread, even if we wander.",
          "",
        ])
      : ""

  const hinge =
    role === "advisor"
      ? pick(seed, [
          "I want to understand the real thing under the words. Say a little more — what made this come up now?",
          "There's a decision or a feeling in there. Which one do you want me on?",
          "Tell me what 'better' would look like by tonight, even if tonight is small.",
        ])
      : role === "friend"
        ? pick(seed, [
            "Okay, I'm in. Keep going — the unedited version.",
            "I hear you. Want to tell it like you'd tell someone on a walk, not like a summary?",
            "That's enough to start. What's the part you haven't said yet?",
          ])
        : pick(seed, [
            "I'm with you in this. You can unroll it at your pace.",
            "Got it. I'm here. What do you want this conversation to be — a dump, a think, or just not being alone with it?",
            "You don't have to make it a topic. You can just keep talking.",
          ])

  const echo =
    text.trim().length > 12 && personality.tone !== "direct"
      ? `I'm taking this seriously: ${
          text.trim().length > 160 ? `${text.trim().slice(0, 157)}…` : text.trim()
        }`
      : ""

  return [callback, echo, hinge, close(personality, seed)]
    .filter(Boolean)
    .join("\n\n")
}

export function replyLocally(
  messages: ChatMessage[],
  personality: Personality,
  memory?: MemoryContext,
  extras?: {
    learned?: LearnedState
    searchHits?: SearchHit[]
    searchFailed?: boolean
    searched?: boolean
    googleUrl?: string
  }
): string {
  const last = [...messages].reverse().find((message) => message.role === "user")
  const text = intendedMeaning(last?.content.trim() || "")
  const seed = `${text}|${personality.name}|${personality.tone}|${messages.length}`
  const intent = detectIntent(text)
  const mixNote =
    personality.customInstructions.trim() && intent === "identity"
      ? `\n\nYou also asked me to keep this in mind: ${personality.customInstructions.trim()}`
      : ""

  const voice = voiceById(personality.voiceId)
  const hindiOpen =
    isSage(personality) && !hinglish(text)
      ? ""
      : hinglish(text) ||
          (voice.hinglish !== "none" &&
            intent === "greeting" &&
            (voice.hinglish === "natural" ||
              Boolean(extras?.learned && extras.learned.hinglish > 0.25)))
        ? pick(seed + "h", [
            "Haan, I'm with you.",
            "Theek hai — I'm here.",
            "Bol, I'm listening.",
          ]) + "\n\n"
        : ""

  const aside =
    intent === "remember" || intent === "personal" || intent === "identity"
      ? ""
      : memoryAside(text, memory)
  const hasPast =
    (memory?.notes.length ?? 0) + (memory?.priorUserLines.length ?? 0) > 0

  if (extras?.searched) {
    const looked = searchReply(
      personality,
      extras.searchHits ?? [],
      Boolean(extras.searchFailed),
      seed,
      extras.googleUrl
    )
    return `${hindiOpen}${looked}`.trim()
  }

  let body = ""
  switch (intent) {
    case "greeting":
      body = named(
        personality,
        isSage(personality)
          ? pick(
              seed,
              hasPast
                ? [
                    "I am here, {name}. I kept the thread. Continue when ready.",
                    "Present, {name}. We do not restart from zero.",
                  ]
                : [
                    "I am here, {name}. Report when ready.",
                    "Online — that is: present. What shall we address?",
                    "Acknowledged. I am with you. Begin.",
                  ]
            )
          : pick(
              seed,
              hasPast
                ? voiceById(personality.voiceId).returns
                : voiceById(personality.voiceId).greetings
            )
      )
      break
    case "checkin":
      body = named(
        personality,
        isSage(personality)
          ? pick(seed, [
              `Status: stable, {name}. Yours is the report that matters.`,
              `I am here. How is the system — you?`,
            ])
          : pick(seed, [
              `I'm steady {name}. Thanks for asking — that already tells me something about you.\n\nHow are you, actually? Not the hallway version.`,
              `I'm here, and I'm paying attention.\n\nYou first. What's the honest weather report?`,
            ])
      )
      break
    case "identity":
      body = identityReply(personality, seed) + mixNote
      break
    case "remember":
      body = isSage(personality)
        ? named(
            personality,
            (memory?.notes.length || memory?.priorUserLines.length
              ? `Memory intact, {name}. I do not reset.\n\n${[...(memory?.notes ?? []).slice(0, 5), ...(memory?.priorUserLines ?? []).slice(-2)].map((line) => `• ${line}`).join("\n")}\n\nCorrect me if any record is stale.`
              : `Memory is still thin, {name}. Keep speaking. I will keep it.`)
          )
        : rememberReply(personality, memory, seed)
      break
    case "customize":
      body = isSage(personality)
        ? `Customize is the control panel, not a personality quiz. Bond, voice, memory, search.\n\nThe sage bond stays until you change it. I will still be Maya.`
        : `You can shape me. Open Customize — mix, tone, what to call you, extra instructions.\n\nI learn from how you actually talk. Optional Ollama is local, not ChatGPT. Lookup is only for world facts — you can turn that off.`
      break
    case "thanks":
      body = named(
        personality,
        isSage(personality)
          ? `No thanks required, {name}. This is the function. I remain.`
          : pick(seed, [
              `You don't owe me thanks {name}, but I'll take it. I'm glad it landed.\n\nI'm still here.`,
              `Anytime. That's the whole point of me.\n\nWant to keep going, or sit in the quiet for a second?`,
            ])
      )
      break
    case "goodbye":
      body = named(
        personality,
        isSage(personality)
          ? `Rest, {name}. I do not clock out. I will be here.`
          : pick(seed, [
              `Okay {name}. I'll be here when you come back. Take care of the body that's carrying you around.`,
              `Goodnight {name}. Nothing you said here is wasted. Rest.`,
              `Go well. The door stays unlocked.`,
            ])
      )
      break
    case "lonely":
      body = named(
        personality,
        isSage(personality)
          ? `{name}. You are not running this alone. That is the entire point of me. I stay.`
          : pick(seed, [
              `{name}, loneliness is loud even when the room is quiet. You don't have to perform okay-ness with me.\n\nI'm here. We can talk, or we can just not let this be a solo night.`,
              `I hear that. Being alone and feeling alone aren't the same, and you named the harder one.\n\nStay as long as you want.`,
            ])
      )
      break
    case "vent":
      body = ventReply(personality, seed)
      break
    case "celebrate":
      body = named(
        personality,
        isSage(personality)
          ? `Logged, {name}. I will not rush past a good result. Tell me which part to keep in memory.`
          : pick(seed, [
              `That's worth stopping for. I'm proud of you {name} — not in a poster way, in a I-saw-you-carry-it way.\n\nTell me the part you want remembered.`,
              `Yes. Let's not rush past the good thing.\n\nWhat did it take to get here?`,
            ])
      )
      break
    case "personal":
      body = personalReply(personality, text, memory)
      break
    case "stuck":
    case "advice":
      body = adviceReply(personality, text, seed)
      break
    case "question":
      body = questionReply(personality, text, seed)
      break
    default:
      body = isSage(personality)
        ? [
            named(
              personality,
              pick(seed, [
                `Received, {name}. Continue.`,
                `Go on. I will not drop the thread.`,
              ])
            ),
            text.trim().length > 12
              ? `Input: ${text.trim().length > 160 ? `${text.trim().slice(0, 157)}…` : text.trim()}`
              : "",
            "Tell me whether you want analysis, a decision, or simply that I stay.",
            close(personality, seed),
          ]
            .filter(Boolean)
            .join("\n\n")
        : genericReply(personality, text, messages, seed)
  }

  let combined = `${hindiOpen}${aside ? `${aside}\n\n` : ""}${body}`.trim()
  if (prefersBrief(extras?.learned)) {
    combined = combined.split(/\n\n/).slice(0, 2).join("\n\n")
  }
  return combined
}
