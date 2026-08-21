import {
  extractHttpUrl,
  fallbackSearchQuery,
  googleSearchUrl,
  searchQueryFor,
  searchWeb,
  readWebPage,
} from "@/lib/search"
import { isMapsQuery, isWeatherQuery, mapsQuery, weatherPlace } from "@/lib/skills"
import { lookupPlace } from "@/lib/maps"
import { intendedMeaning } from "@/lib/typos"
import { fetchWeather } from "@/lib/weather"
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

export async function lookupWeb(
  text: string,
  force: boolean,
  hometown?: string
): Promise<Lookup> {
  const intended = intendedMeaning(text)
  const pageUrl = extractHttpUrl(intended)
  const query = force ? fallbackSearchQuery(intended) : searchQueryFor(intended)
  let hits: SearchHit[] = []
  let searched = false
  let searchFailed = false
  let googleUrl: string | undefined

  if (isWeatherQuery(intended)) {
    searched = true
    const place = weatherPlace(intended, hometown)
    if (!place) {
      hits.push({
        title: "Weather",
        snippet:
          "Name a city and I’ll look it up live — try “weather in Hyderabad”. If you tell me where you live, I’ll remember it for next time.",
        source: "Weather",
        url: "",
      })
    } else {
      googleUrl = googleSearchUrl(`weather ${place}`)
      try {
        const weather = await fetchWeather(place)
        if (weather) hits.push(weather)
        else searchFailed = true
      } catch {
        searchFailed = true
      }
    }
  }

  if (isMapsQuery(intended)) {
    searched = true
    const dest = mapsQuery(intended, hometown)
    if (dest) {
      googleUrl = googleSearchUrl(`${dest} map`)
      try {
        const maps = await lookupPlace(dest)
        if (maps) hits.unshift(maps)
        else searchFailed = true
      } catch {
        searchFailed = true
      }
    }
  }

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

  if (
    query &&
    !/^https?:\/\//i.test(query) &&
    !hits.some((hit) => hit.source === "Weather" || hit.source === "Maps")
  ) {
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
