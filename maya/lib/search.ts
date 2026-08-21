import type { SearchHit } from "@/lib/types"

const NOT_SEARCH = [
  /who are you/,
  /what are you/,
  /do you remember/,
  /what did i/,
  /how are you/,
  /what's up/,
  /whats up/,
  /i feel/,
  /i'm (sad|tired|lonely|scared|anxious|ok|fine)/,
  /keep me company/,
  /just need to talk/,
  /help me think/,
  /should i/,
  /what would you/,
  /what do you think about me/,
  /customize/,
  /your name/,
]

export function searchQueryFor(text: string): string | null {
  const t = text.trim()
  const lower = t.toLowerCase()
  if (t.length < 8) return null
  if (NOT_SEARCH.some((pattern) => pattern.test(lower))) return null

  const explicit = t.match(
    /\b(?:look(?:\s+this)?\s+up|search(?:\s+for)?|google|find out(?:\s+about)?|check(?:\s+the web)?(?:\s+for)?)\s+[:\-]?\s*(.+)$/i
  )
  if (explicit?.[1]) {
    const query = explicit[1].replace(/[?.!]+$/g, "").trim()
    return query.length >= 2 ? query : t
  }

  if (
    /\b(weather in|news about|stock price|who won|latest on|current (price|score|population|president))\b/i.test(
      t
    )
  ) {
    return t.replace(/[?.!]+$/g, "").trim()
  }

  if (
    /^(what is|what's|who is|who's|when did|where is|how many|how much)\b/i.test(
      lower
    ) &&
    !/^(what's (wrong|up|going)|what is (wrong|going)|who is she|who are we)\b/i.test(
      lower
    ) &&
    t.length < 180
  ) {
    return t.replace(/[?.!]+$/g, "").trim()
  }

  return null
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
  const response = await fetch(url, { signal })
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

async function wikipedia(query: string, signal: AbortSignal): Promise<SearchHit[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&namespace=0&format=json&origin=*`
  const response = await fetch(url, { signal })
  if (!response.ok) return []
  const data = (await response.json()) as [string, string[], string[], string[]]
  const titles = data[1] || []
  const snippets = data[2] || []
  const urls = data[3] || []
  return titles.map((title, index) => ({
    title,
    snippet: snippets[index] || title,
    source: "Wikipedia",
    url: urls[index] || "",
  }))
}

export async function searchWeb(query: string): Promise<SearchHit[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4500)
  try {
    const settled = await Promise.allSettled([
      duckDuckGo(query, controller.signal),
      wikipedia(query, controller.signal),
    ])
    const merged: SearchHit[] = []
    for (const result of settled) {
      if (result.status === "fulfilled") merged.push(...result.value)
    }
    const seen = new Set<string>()
    return merged.filter((hit) => {
      const key = hit.snippet.slice(0, 80)
      if (!hit.snippet.trim() || seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 4)
  } finally {
    clearTimeout(timer)
  }
}
