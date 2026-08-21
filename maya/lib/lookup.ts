import {
  extractHttpUrl,
  fallbackSearchQuery,
  googleSearchUrl,
  searchQueryFor,
  searchWeb,
  readWebPage,
} from "@/lib/search"
import type { SearchHit } from "@/lib/types"

export type Lookup = {
  hits: SearchHit[]
  searched: boolean
  searchFailed: boolean
  googleUrl?: string
}

function uniqueBySnippet(hits: SearchHit[]): SearchHit[] {
  const seen = new Set<string>()
  return hits.filter((hit) => {
    const key = hit.snippet.slice(0, 80)
    if (!hit.snippet.trim() || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function lookupWeb(text: string, force: boolean): Promise<Lookup> {
  const pageUrl = extractHttpUrl(text)
  const query = force ? fallbackSearchQuery(text) : searchQueryFor(text)
  let hits: SearchHit[] = []
  let searched = false
  let searchFailed = false
  let googleUrl: string | undefined

  if (pageUrl) {
    searched = true
    try {
      const page = await readWebPage(pageUrl)
      if (page) hits.push(page)
      else searchFailed = true
    } catch {
      searchFailed = true
    }
  }

  if (query && !/^https?:\/\//i.test(query)) {
    searched = true
    googleUrl = googleSearchUrl(query)
    try {
      const web = await searchWeb(query)
      hits = uniqueBySnippet([...hits, ...web])
      if (!hits.length) searchFailed = true
    } catch {
      searchFailed = true
    }
  }

  return { hits, searched, searchFailed, googleUrl }
}

export function hitsForModel(lookup: Lookup): SearchHit[] {
  if (lookup.hits.length) return lookup.hits
  if (lookup.searchFailed && lookup.googleUrl) {
    return [
      {
        title: "Google",
        snippet: `Lookup did not return a snippet. Open this search: ${lookup.googleUrl}`,
        source: "Google",
        url: lookup.googleUrl,
      },
    ]
  }
  return []
}
