import type { SearchHit } from "@/lib/types"

const UA =
  "MayaCompanion/0.1 (https://github.com/flute-master/maya; local personal companion)"

export type NewsScope = "local" | "national" | "world" | "topic" | "briefing"

export type NewsAsk = {
  scope: NewsScope
  place?: string
  country: string
  topic?: string
}

type Edition = { hl: string; gl: string; ceid: string; label: string }

const EDITIONS: Record<string, Edition> = {
  IN: { hl: "en-IN", gl: "IN", ceid: "IN:en", label: "India" },
  US: { hl: "en-US", gl: "US", ceid: "US:en", label: "United States" },
  GB: { hl: "en-GB", gl: "GB", ceid: "GB:en", label: "Britain" },
  AU: { hl: "en-AU", gl: "AU", ceid: "AU:en", label: "Australia" },
  CA: { hl: "en-CA", gl: "CA", ceid: "CA:en", label: "Canada" },
  NZ: { hl: "en-NZ", gl: "NZ", ceid: "NZ:en", label: "New Zealand" },
  IE: { hl: "en-IE", gl: "IE", ceid: "IE:en", label: "Ireland" },
  ZA: { hl: "en-ZA", gl: "ZA", ceid: "ZA:en", label: "South Africa" },
  SG: { hl: "en-SG", gl: "SG", ceid: "SG:en", label: "Singapore" },
  FR: { hl: "fr", gl: "FR", ceid: "FR:fr", label: "France" },
  DE: { hl: "de", gl: "DE", ceid: "DE:de", label: "Germany" },
}

const PLACE_COUNTRY: Array<{ test: RegExp; country: string }> = [
  { test: /\b(india|delhi|mumbai|hyderabad|chennai|bengaluru|bangalore|kolkata|pune|lucknow|chandigarh|jaipur|ahmedabad|kochi|kerala|punjab|tamil|telangana|andhra)\b/i, country: "IN" },
  { test: /\b(united states|u\.?s\.?a?\.?|america|new york|california|chicago|atlanta|boston|seattle|texas)\b/i, country: "US" },
  { test: /\b(united kingdom|britain|england|london|scotland|edinburgh|wales|uk)\b/i, country: "GB" },
  { test: /\b(australia|sydney|melbourne|brisbane|perth)\b/i, country: "AU" },
  { test: /\b(canada|toronto|vancouver|montreal)\b/i, country: "CA" },
  { test: /\b(new zealand|auckland|wellington)\b/i, country: "NZ" },
  { test: /\b(ireland|dublin)\b/i, country: "IE" },
  { test: /\b(south africa|cape town|johannesburg)\b/i, country: "ZA" },
  { test: /\b(singapore)\b/i, country: "SG" },
  { test: /\b(france|paris)\b/i, country: "FR" },
  { test: /\b(germany|berlin)\b/i, country: "DE" },
]

function editionFor(country: string): Edition {
  return EDITIONS[country] ?? EDITIONS.IN
}

export function inferNewsCountry(...hints: Array<string | undefined>) {
  const blob = hints.filter(Boolean).join(" ")
  for (const row of PLACE_COUNTRY) {
    if (row.test.test(blob)) return row.country
  }
  return "IN"
}

function tidyNewsPlace(raw: string) {
  return raw
    .replace(/\b(please|today|now|right now|the latest|latest|headlines?|news)\b/gi, "")
    .replace(/[?.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function isNewsQuery(text: string): boolean {
  const lower = text.toLowerCase()
  if (
    /\b(i have|i've got|got some|my|good|bad|great|exciting) news\b/.test(lower) &&
    !/\b(the news|headlines|world news|national news|local news)\b/.test(lower)
  ) {
    return false
  }
  return (
    /^(news|headlines|briefing)[.!?]?$/.test(lower) ||
    /\b(the news|latest news|news headlines|news today|today'?s news|morning briefing|news briefing)\b/.test(
      lower
    ) ||
    /\b(world news|global news|international news|national news|local news|india news|indian news)\b/.test(
      lower
    ) ||
    /\bnews (in|for|about|from|on)\b/.test(lower) ||
    /\b(what(?:'s| is) (the )?(news|headlines))\b/.test(lower) ||
    /\b(what(?:'s| is) happening)\b.{0,24}\b(world|india|news|city|town|hyderabad|delhi|mumbai)\b/.test(
      lower
    ) ||
    /\bheadlines\b/.test(lower) ||
    /^(any news|latest headlines|catch me up|morning news)[.!?]?$/.test(lower) ||
    /\b(any (latest )?news|what(?:'s| is) happening (in the )?(world|today)|catch me up on (the )?news)\b/.test(
      lower
    )
  )
}

export function newsAsk(text: string, hometown?: string): NewsAsk {
  const country = inferNewsCountry(text, hometown)
  const about = text.match(/\bnews (?:about|on|regarding)\s+(.+)$/i)
  if (about?.[1]) {
    const topic = tidyNewsPlace(about[1])
    if (topic) return { scope: "topic", topic, country }
  }

  const inPlace = text.match(
    /\b(?:news|headlines) (?:in|for|from|near)\s+(.+)$/i
  )
  if (inPlace?.[1]) {
    const place = tidyNewsPlace(inPlace[1])
    if (/^(the )?(world|globe|earth|international)$/i.test(place)) {
      return { scope: "world", country }
    }
    if (/^(india|the country|national|this country)$/i.test(place)) {
      return { scope: "national", country: inferNewsCountry(place, hometown) }
    }
    return {
      scope: "local",
      place,
      country: inferNewsCountry(place, hometown),
    }
  }

  const lower = text.toLowerCase()
  if (/\b(world|global|international)\b/.test(lower)) {
    return { scope: "world", country }
  }
  if (/\b(national|india news|indian news)\b/.test(lower)) {
    return { scope: "national", country }
  }
  if (/\b(local|city|my (city|town|area))\b/.test(lower)) {
    return { scope: "local", place: hometown, country }
  }
  return { scope: "briefing", place: hometown, country }
}

type Story = { title: string; url: string; source: string }

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/\s+/g, " ")
    .trim()
}

function storiesFromRss(xml: string, limit: number): Story[] {
  const stories: Story[] = []
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []
  for (const block of blocks) {
    const title = decodeXml(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "")
    const url = decodeXml(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "")
    let source = decodeXml(
      block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || ""
    )
    if (!source && title.includes(" - ")) {
      source = title.split(" - ").at(-1) || ""
    }
    const headline = title.replace(/\s+-\s+[^-]+$/, "").trim()
    if (!headline || headline.length < 8) continue
    if (stories.some((row) => row.title === headline)) continue
    stories.push({
      title: headline.slice(0, 180),
      url: url.startsWith("http") ? url : "",
      source: source || "News",
    })
    if (stories.length >= limit) break
  }
  return stories
}

async function fetchRss(url: string, limit: number): Promise<Story[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": UA },
    })
    if (!response.ok) return []
    const xml = await response.text()
    if (!xml.includes("<item")) return []
    return storiesFromRss(xml, limit)
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

function googleNewsUrl(path: string, edition: Edition, query?: string) {
  const params = new URLSearchParams({
    hl: edition.hl,
    gl: edition.gl,
    ceid: edition.ceid,
  })
  if (query) params.set("q", query)
  return `https://news.google.com/rss${path}?${params.toString()}`
}

function formatStories(label: string, stories: Story[]) {
  if (!stories.length) return `${label}\n• No headlines came back for this section.`
  const lines = stories.map((story) => {
    const src = story.source ? ` (${story.source})` : ""
    return `• ${story.title}${src}`
  })
  const open = stories[0]?.url ? `\n  ${stories[0].url}` : ""
  return `${label}\n${lines.join("\n")}${open}`
}

async function worldStories(limit: number) {
  const bbc = await fetchRss("https://feeds.bbci.co.uk/news/world/rss.xml", limit)
  if (bbc.length) return bbc
  const edition = editionFor("US")
  const google = await fetchRss(
    googleNewsUrl("/search", edition, "world news when:1d"),
    limit
  )
  if (google.length) return google
  return fetchRss("https://feeds.bbci.co.uk/news/rss.xml", limit)
}

async function nationalStories(country: string, limit: number) {
  const edition = editionFor(country)
  const top = await fetchRss(googleNewsUrl("", edition), limit)
  if (top.length) return top
  if (country === "IN") {
    const hindu = await fetchRss(
      "https://www.thehindu.com/news/national/feeder/default.rss",
      limit
    )
    if (hindu.length) return hindu
    return fetchRss("https://feeds.bbci.co.uk/news/world/asia/india/rss.xml", limit)
  }
  return fetchRss(
    googleNewsUrl("/search", edition, `${edition.label} news when:1d`),
    limit
  )
}

async function localStories(place: string, country: string, limit: number) {
  const edition = editionFor(country)
  const query = `${place} when:2d`
  const stories = await fetchRss(googleNewsUrl("/search", edition, query), limit)
  if (stories.length) return stories
  return fetchRss(googleNewsUrl("/search", edition, place), limit)
}

async function topicStories(topic: string, country: string, limit: number) {
  const edition = editionFor(country)
  return fetchRss(googleNewsUrl("/search", edition, `${topic} when:7d`), limit)
}

function hitFromSections(
  title: string,
  sections: string[],
  url: string
): SearchHit | null {
  const body = sections.filter(Boolean).join("\n\n")
  if (!body.includes("• ")) return null
  return {
    title,
    snippet: `${body}\n\nLive headlines from Google News RSS (BBC / The Hindu if Google is quiet) — not a guess.`,
    source: "News",
    url,
  }
}

export async function fetchNews(ask: NewsAsk): Promise<SearchHit | null> {
  const edition = editionFor(ask.country)
  const nation = edition.label

  if (ask.scope === "local") {
    const place = ask.place?.trim()
    if (!place) {
      return {
        title: "Local news",
        snippet:
          "Name a city and I’ll look it up live — try “news in Hyderabad”. If you tell me where you live, I’ll remember it for next time.",
        source: "News",
        url: "",
      }
    }
    const stories = await localStories(place, ask.country, 6)
    return hitFromSections(
      `Local news - ${place}`,
      [formatStories(`Local · ${place}`, stories)],
      stories[0]?.url || `https://news.google.com/search?q=${encodeURIComponent(place)}`
    )
  }

  if (ask.scope === "national") {
    const stories = await nationalStories(ask.country, 6)
    return hitFromSections(
      `National news - ${nation}`,
      [formatStories(`National · ${nation}`, stories)],
      stories[0]?.url || "https://news.google.com/"
    )
  }

  if (ask.scope === "world") {
    const stories = await worldStories(6)
    return hitFromSections(
      "World news",
      [formatStories("World", stories)],
      stories[0]?.url || "https://news.google.com/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVLQUFQAQ"
    )
  }

  if (ask.scope === "topic" && ask.topic) {
    const stories = await topicStories(ask.topic, ask.country, 6)
    return hitFromSections(
      `News - ${ask.topic}`,
      [formatStories(`About ${ask.topic}`, stories)],
      stories[0]?.url ||
        `https://news.google.com/search?q=${encodeURIComponent(ask.topic)}`
    )
  }

  const place = ask.place?.trim()
  const [local, national, world] = await Promise.all([
    place ? localStories(place, ask.country, 3) : Promise.resolve([]),
    nationalStories(ask.country, 4),
    worldStories(4),
  ])

  const sections: string[] = []
  if (place && local.length) {
    sections.push(formatStories(`Local · ${place}`, local))
  } else if (!place) {
    sections.push(
      "Local — I don’t have your city yet. Say “news in Hyderabad”, or tell me where you live."
    )
  } else {
    sections.push(formatStories(`Local · ${place}`, local))
  }
  sections.push(formatStories(`National · ${nation}`, national))
  sections.push(formatStories("World", world))

  const first = local[0] || national[0] || world[0]
  return hitFromSections(
    place ? `News briefing - ${place}, ${nation}, world` : `News briefing - ${nation} and world`,
    sections,
    first?.url || "https://news.google.com/"
  )
}
