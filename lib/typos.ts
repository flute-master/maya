/** Common typing slips Maya should treat as the intended word — silently. */

const WORD_FIXES: Record<string, string> = {
  weathere: "weather",
  wether: "weather",
  wheather: "weather",
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
  weathr: "weather",
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
};

function fixToken(raw: string): string {
  const m = raw.match(/^(\W*)(.*?)(\W*)$/);
  if (!m) return raw;
  const [, lead, core, trail] = m;
  if (!core) return raw;
  const collapsed = core.replace(/([A-Za-z])\1{2,}/g, "$1$1");
  const key = collapsed.toLowerCase();
  const mapped = WORD_FIXES[key];
  if (!mapped) {
    return lead + collapsed + trail;
  }
  let fixed = mapped;
  if (core === core.toUpperCase() && core.length > 1) {
    fixed = mapped.toUpperCase();
  } else if (core[0] === core[0].toUpperCase()) {
    fixed = mapped[0].toUpperCase() + mapped.slice(1);
  }
  return lead + fixed + trail;
}

/** Best-effort intended meaning. Original chat bubble is left as typed. */
export function intendedMeaning(text: string): string {
  return text
    .split(/(\s+)/)
    .map((part) => (/\s/.test(part) ? part : fixToken(part)))
    .join("")
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
