/** Infer hurried typing. The chat bubble stays as typed. */

const WORD_FIXES: Record<string, string> = {
  weathere: "weather",
  wether: "weather",
  wheather: "weather",
  weater: "weather",
  weatrher: "weather",
  weathr: "weather",
  newz: "news",
  newss: "news",
  mangga: "manga",
  tatchiyomi: "tachiyomi",
  tachyomi: "tachiyomi",
  mihonn: "mihon",
  hedlins: "headlines",
  headines: "headlines",
  temperture: "temperature",
  recieve: "receive",
  recieved: "received",
  recieving: "receiving",
  occured: "occurred",
  seperate: "separate",
  definately: "definitely",
  tommorow: "tomorrow",
  tommorrow: "tomorrow",
  tomorow: "tomorrow",
  yestarday: "yesterday",
  thier: "their",
  teh: "the",
  hte: "the",
  dont: "don't",
  doesnt: "doesn't",
  cant: "can't",
  wont: "won't",
  im: "i'm",
  ive: "i've",
  thats: "that's",
  whats: "what's",
  wheres: "where's",
  hows: "how's",
  lets: "let's",
  hyderbad: "hyderabad",
  hyderabd: "hyderabad",
  hydrabad: "hyderabad",
  hyderabaf: "hyderabad",
  banglore: "bangalore",
  bangalor: "bangalore",
  mumabi: "mumbai",
  delh: "delhi",
  chennaii: "chennai",
  calcuta: "kolkata",
  colomboo: "colombo",
  reccomend: "recommend",
  reccomendation: "recommendation",
  reccomendations: "recommendations",
  reccomendme: "recommend",
  adress: "address",
  enviornment: "environment",
  goverment: "government",
  independant: "independent",
  knowlege: "knowledge",
  langauge: "language",
  lenght: "length",
  neccessary: "necessary",
  occassion: "occasion",
  publically: "publicly",
  refering: "referring",
  sucess: "success",
  sucessful: "successful",
  untill: "until",
  usefull: "useful",
  writting: "writing",
  writen: "written",
  begining: "beginning",
  beleive: "believe",
  calender: "calendar",
  calander: "calendar",
  comming: "coming",
  coning: "coming",
  predd: "press",
  peice: "piece",
  realy: "really",
  recieveing: "receiving",
  resturant: "restaurant",
  seperately: "separately",
  "tommorow's": "tomorrow's",
  wierd: "weird",
  youre: "you're",
  theyre: "they're",
  forcast: "forecast",
  forcasts: "forecast",
  temprature: "temperature",
  tempratures: "temperatures",
  skilss: "skills",
  skils: "skills",
  proffesional: "professional",
  internnship: "internship",
  internshp: "internship",
  collegue: "colleague",
  collegues: "colleagues",
  univeristy: "university",
  univercity: "university",
  onw: "one",
  anothr: "another",
  anotehr: "another",
  antoher: "another",
  anohter: "another",
  jok: "joke",
  jke: "joke",
  joek: "joke",
  jokw: "joke",
  uo: "up",
  refesh: "refresh",
  refrsh: "refresh",
  relaod: "reload",
  reoload: "reload",
  ply: "play",
  paly: "play",
  plaay: "play",
  metr: "metro",
  metor: "metro",
  miyapr: "miyapur",
  miyapu: "miyapur",
  miyapurr: "miyapur",
  rech: "reach",
  recah: "reach",
  direcitons: "directions",
  dirctions: "directions",
  navigte: "navigate",
  youtub: "youtube",
  youtbe: "youtube",
  plz: "please",
  pls: "please",
  wher: "where",
  waht: "what",
  whos: "who's",
  tehse: "these",
}

const LEXICON = Array.from(
  new Set([
    ...Object.values(WORD_FIXES),
    "weather",
    "forecast",
    "temperature",
    "news",
    "headlines",
    "play",
    "song",
    "youtube",
    "music",
    "way",
    "directions",
    "navigate",
    "metro",
    "station",
    "airport",
    "maps",
    "map",
    "joke",
    "jokes",
    "story",
    "pun",
    "refresh",
    "clear",
    "calendar",
    "reminder",
    "another",
    "one",
    "please",
    "reach",
    "hyderabad",
    "miyapur",
    "bangalore",
    "mumbai",
    "delhi",
    "chennai",
    "kolkata",
    "flute",
    "calculate",
    "python",
    "gmail",
  ])
)

const AFTER_ANOTHER = ["one", "joke", "please", "story"]

const KEEP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "new",
  "chat",
  "just",
  "like",
  "from",
  "with",
  "this",
  "that",
  "have",
  "been",
  "will",
  "want",
  "need",
  "know",
  "think",
  "make",
  "take",
  "give",
  "look",
  "live",
  "name",
  "time",
  "only",
  "also",
  "very",
  "much",
  "more",
  "some",
  "than",
  "then",
  "them",
  "they",
  "when",
  "what",
  "who",
  "how",
  "why",
  "not",
  "can",
  "for",
  "you",
  "are",
  "was",
  "were",
  "his",
  "her",
  "our",
  "your",
  "its",
  "all",
  "any",
  "few",
  "own",
  "same",
  "such",
  "too",
  "now",
  "here",
  "there",
  "back",
  "well",
  "still",
  "even",
  "over",
  "after",
  "before",
  "about",
  "into",
  "out",
  "off",
  "yes",
  "no",
  "ok",
  "hi",
  "hey",
  "me",
  "my",
  "we",
  "us",
  "it",
  "to",
  "of",
  "in",
  "on",
  "at",
  "up",
])

const FUZZY_TARGETS = LEXICON.filter((word) => word.length >= 5)

const PHRASES: Array<[RegExp, string]> = [
  [/^\s*wafa(?:\s+to)?\b/i, "way to"],
  [/\b(?:wfa|wya|wat|waay)\s+(?:to\s+)?/gi, "way to "],
  [/\bhow?\s+to\s+rech\b/gi, "how to reach"],
  [/\bhoe\s+to\s+reach\b/gi, "how to reach"],
  [/\bhw\s+to\s+(?:get|reach)\b/gi, "how to reach"],
  [/\banother\s+onw\b/gi, "another one"],
  [/\byou are uo\b/gi, "you are up"],
  [/\btell me a jok\b/gi, "tell me a joke"],
]

function editDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1
    row[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const cur = row[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost)
      prev = cur
    }
  }
  return row[b.length] ?? b.length
}

function maxEdits(word: string) {
  if (word.length <= 6) return 1
  return 2
}

function closest(word: string, pool: string[]): string | null {
  const key = word.toLowerCase()
  let best: string | null = null
  let bestDist = Infinity
  let ties = 0
  const cap = maxEdits(key)
  for (const candidate of pool) {
    if (Math.abs(candidate.length - key.length) > cap) continue
    if (candidate[0] !== key[0]) continue
    const dist = editDistance(key, candidate)
    if (dist > cap) continue
    if (dist < bestDist) {
      best = candidate
      bestDist = dist
      ties = 1
    } else if (dist === bestDist) {
      ties += 1
    }
  }
  if (!best || ties > 1) return null
  return best
}

function applyCase(source: string, mapped: string) {
  if (source === source.toUpperCase() && source.length > 1) {
    return mapped.toUpperCase()
  }
  if (source[0] === source[0]?.toUpperCase()) {
    return mapped[0]?.toUpperCase() + mapped.slice(1)
  }
  return mapped
}

function fixToken(raw: string, previous: string): string {
  const m = raw.match(/^(\W*)(.*?)(\W*)$/)
  if (!m) return raw
  const [, lead, core, trail] = m
  if (!core) return raw
  const collapsed = core.replace(/([A-Za-z])\1{2,}/g, "$1$1")
  const key = collapsed.toLowerCase()
  if (KEEP.has(key)) return lead + collapsed + trail
  let mapped = WORD_FIXES[key]
  if (!mapped && previous.toLowerCase() === "another") {
    const ctx = closest(key, AFTER_ANOTHER)
    if (ctx) mapped = ctx
  }
  if (!mapped && !LEXICON.includes(key) && key.length >= 5) {
    mapped = closest(key, FUZZY_TARGETS) ?? undefined
  }
  if (!mapped) {
    return lead + collapsed + trail
  }
  return lead + applyCase(core, mapped) + trail
}

function tidyLine(text: string) {
  return text
    .replace(/^[[{(<]+/, "")
    .replace(/[\s\]}>]+$/g, "")
    .replace(/\]+$/g, "")
    .trim()
}

/** Best-effort intended meaning. Original chat bubble is left as typed. */
export function intendedMeaning(text: string): string {
  let next = tidyLine(text)
  for (const [pattern, replacement] of PHRASES) {
    next = next.replace(pattern, replacement)
  }
  const parts = next.split(/(\s+)/)
  let previous = ""
  const rewritten = parts.map((part) => {
    if (/\s/.test(part)) return part
    const fixed = fixToken(part, previous)
    previous = fixed.replace(/^\W+|\W+$/g, "")
    return fixed
  })
  return rewritten.join("").replace(/\s+/g, " ").trim()
}

/** Rewrite only the latest user turn for search, memory, and the model. */
export function interpretLastUser<T extends { role: string; content: string }>(
  messages: T[]
): T[] {
  const next = messages.map((message) => ({ ...message }))
  for (let i = next.length - 1; i >= 0; i -= 1) {
    if (next[i].role === "user") {
      next[i] = {
        ...next[i],
        content: intendedMeaning(next[i].content),
      }
      break
    }
  }
  return next
}
