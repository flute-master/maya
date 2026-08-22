import type { SearchHit } from "@/lib/types"
import { shouldSkipWeb } from "@/lib/skills"

const UA =
  "MayaCompanion/0.1 (https://github.com/flute-master/maya; local personal companion)"

const NOT_SEARCH = [
  /what can you (actually )?do/,
  /who are you/,
  /what are you/,
  /tell me about yourself/,
  /do you remember/,
  /what did i/,
  /how are you/,
  /how's it going/,
  /what's up/,
  /whats up/,
  /i feel/,
  /i'm (sad|tired|lonely|scared|anxious|ok|fine)/,
  /keep me company/,
  /just need to talk/,
  /should i/,
  /what would you/,
  /what do you think about me/,
  /customize/,
  /your name/,
  /who am i/,
]

export function isPersonalFactQuery(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    /\b(my skills?|my job|my name|my age|my hobbies|where do i live|what do i do)\b/.test(
      lower
    ) || /what (are|is) my\b/.test(lower)
  )
}

export function fallbackSearchQuery(text: string): string | null {
  const direct = searchQueryFor(text)
  if (direct) return direct
  const t = text.trim()
  if (t.length < 10) return null
  if (isPersonalFactQuery(t)) return null
  if (shouldSkipWeb(t)) return null
  const lower = t.toLowerCase()
  if (NOT_SEARCH.some((pattern) => pattern.test(lower))) return null
  return t.replace(/[?.!]+$/g, "").trim()
}

export function modelNeedsWeb(reply: string): boolean {
  return /\b(i (do not|don't|do not currently|cannot|can't) (know|verify|confirm|access)|not (enough|sure|certain)|no (current|live|recent) (data|information)|beyond my (knowledge|training)|as of my (last|training)|would need to (search|look|browse)|look( it)? up (online|on the web|for you)|i don't have access to (the )?(internet|web|browser)|i cannot browse)\b/i.test(
    reply
  )
}

export function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`
}

export function extractHttpUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i)
  if (match?.[0]) return match[0].replace(/[),.;]+$/g, "")
  const www = text.match(/\bwww\.[^\s<>"']+/i)
  if (www?.[0]) return `https://${www[0].replace(/[),.;]+$/g, "")}`
  return null
}

function cleanQuery(text: string) {
  return text.replace(/[?.!]+$/g, "").trim()
}

export function searchQueryFor(text: string): string | null {
  const t = text.trim()
  const lower = t.toLowerCase()
  if (t.length < 6) return null
  if (isPersonalFactQuery(t)) return null
  if (shouldSkipWeb(t)) return null
  if (NOT_SEARCH.some((pattern) => pattern.test(lower))) return null

  const explicit = t.match(
    /\b(?:look(?:\s+this)?\s+up|search(?:\s+the web)?(?:\s+for)?|google this|browse|use the browser|find out(?:\s+about)?|check the web(?:\s+for)?)\s*[:\-]?\s*(.+)$/i
  )
  if (explicit?.[1]) {
    const query = cleanQuery(explicit[1])
    if (query.length >= 2 && !/^https?:\/\//i.test(query)) return query
    if (query.length >= 2) return query
    return cleanQuery(t)
  }

  if (
    /\b(look(?:\s+this)?\s+up|search the web|google this|stock price|who won|latest on|current (price|score|population|president))\b/i.test(
      t
    )
  ) {
    return cleanQuery(t)
  }

  return null
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function flattenRelated(
  topics: unknown,
  hits: SearchHit[],
  limit: number
) {
  if (!Array.isArray(topics) || hits.length >= limit) return
  for (const item of topics) {
    if (hits.length >= limit) return
    if (!item || typeof item !== "object") continue
    const row = item as {
      Text?: string
      FirstURL?: string
      Topics?: unknown
    }
    if (row.Topics) flattenRelated(row.Topics, hits, limit)
    if (row.Text && row.FirstURL) {
      hits.push({
        title: row.Text.slice(0, 80),
        snippet: row.Text,
        source: "DuckDuckGo",
        url: row.FirstURL,
      })
    }
  }
}

async function duckDuckGo(query: string, signal: AbortSignal): Promise<SearchHit[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json", "User-Agent": UA },
  })
  if (!response.ok) return []
  const data = (await response.json()) as {
    Heading?: string
    AbstractText?: string
    AbstractURL?: string
    AbstractSource?: string
    Answer?: string
    Definition?: string
    DefinitionURL?: string
    RelatedTopics?: unknown
  }
  const hits: SearchHit[] = []
  if (data.AbstractText) {
    hits.push({
      title: data.Heading || query,
      snippet: data.AbstractText,
      source: data.AbstractSource || "DuckDuckGo",
      url: data.AbstractURL || "",
    })
  }
  if (data.Answer) {
    hits.push({
      title: data.Heading || query,
      snippet: data.Answer,
      source: "DuckDuckGo",
      url: data.AbstractURL || "",
    })
  }
  if (data.Definition) {
    hits.push({
      title: data.Heading || query,
      snippet: data.Definition,
      source: "Definition",
      url: data.DefinitionURL || "",
    })
  }
  flattenRelated(data.RelatedTopics, hits, 4)
  return hits
}

async function duckDuckGoHtml(
  query: string,
  signal: AbortSignal
): Promise<SearchHit[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: "text/html",
      "User-Agent": UA,
    },
  })
  if (!response.ok) return []
  const html = await response.text()
  const hits: SearchHit[] = []
  const block =
    /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\//gi
  let match: RegExpExecArray | null
  while ((match = block.exec(html)) && hits.length < 4) {
    const rawHref = decodeHtml(match[1] || "")
    const title = decodeHtml(match[2] || "")
    const snippet = decodeHtml(match[3] || "")
    if (!title || !snippet) continue
    let href = rawHref
    try {
      const parsed = new URL(rawHref, "https://duckduckgo.com")
      href = parsed.searchParams.get("uddg") || parsed.href
    } catch {
      /* keep raw */
    }
    hits.push({
      title: title.slice(0, 90),
      snippet: snippet.slice(0, 420),
      source: "DuckDuckGo",
      url: href.startsWith("http") ? href : "",
    })
  }
  return hits
}

async function wikipedia(query: string, signal: AbortSignal): Promise<SearchHit[]> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=3&origin=*`
  const response = await fetch(searchUrl, {
    signal,
    headers: { Accept: "application/json", "User-Agent": UA },
  })
  if (!response.ok) return []
  const data = (await response.json()) as {
    query?: { search?: Array<{ title?: string; snippet?: string }> }
  }
  const rows = (data.query?.search ?? []).slice(0, 2)
  const hits: SearchHit[] = []
  for (const row of rows) {
    if (!row.title) continue
    const title = row.title
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`
    let snippet = decodeHtml(row.snippet || title)
    let url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`
    try {
      const summary = await fetch(summaryUrl, {
        signal,
        headers: { Accept: "application/json", "User-Agent": UA },
      })
      if (summary.ok) {
        const body = (await summary.json()) as {
          extract?: string
          content_urls?: { desktop?: { page?: string } }
        }
        if (body.extract) snippet = body.extract
        if (body.content_urls?.desktop?.page) url = body.content_urls.desktop.page
      }
    } catch {
      /* keep search snippet */
    }
    hits.push({
      title,
      snippet: snippet.slice(0, 700),
      source: "Wikipedia",
      url,
    })
  }
  return hits
}

function uniqueHits(merged: SearchHit[]): SearchHit[] {
  const seen = new Set<string>()
  return merged
    .filter((hit) => {
      const key = `${hit.source}|${hit.snippet.slice(0, 80)}`
      if (!hit.snippet.trim() || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 5)
}

export async function searchWeb(query: string): Promise<SearchHit[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const instant = await duckDuckGo(query, controller.signal).catch(() => [])
    if (instant.length) {
      const extra = await Promise.allSettled([
        wikipedia(query, controller.signal),
      ])
      const merged = [...instant]
      for (const result of extra) {
        if (result.status === "fulfilled") merged.push(...result.value)
      }
      return uniqueHits(merged)
    }

    const settled = await Promise.allSettled([
      duckDuckGoHtml(query, controller.signal),
      wikipedia(query, controller.signal),
    ])
    const merged: SearchHit[] = []
    for (const result of settled) {
      if (result.status === "fulfilled") merged.push(...result.value)
    }
    return uniqueHits(merged)
  } finally {
    clearTimeout(timer)
  }
}

export async function readWebPage(url: string): Promise<SearchHit | null> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 7000)
  try {
    const response = await fetch(parsed.href, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
        "User-Agent": UA,
      },
      redirect: "follow",
    })
    if (!response.ok) return null
    const contentType = response.headers.get("content-type") || ""
    const raw = await response.text()
    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = decodeHtml(titleMatch?.[1] || parsed.hostname)
    const withoutNoise = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    const snippet = decodeHtml(withoutNoise).slice(0, 1600)
    if (snippet.length < 40) return null
    return {
      title,
      snippet,
      source: contentType.includes("html") ? parsed.hostname : "Page",
      url: parsed.href,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
