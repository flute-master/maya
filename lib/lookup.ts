import {
  extractHttpUrl,
  fallbackSearchQuery,
  googleSearchUrl,
  isPersonalFactQuery,
  searchQueryFor,
  searchWeb,
  readWebPage,
} from "@/lib/search"
import { fetchGithubProfile } from "@/lib/github"
import {
  hasSearchableIdentity,
  isAgeQuery,
  selfLookupQuery,
  type PublicIdentity,
} from "@/lib/identity"
import { factsFromHits } from "@/lib/learn"
import { lookupPlace } from "@/lib/maps"
import { isMapsQuery, isWeatherQuery, mapsQuery, weatherPlace } from "@/lib/skills"
import { intendedMeaning } from "@/lib/typos"
import { fetchWeather } from "@/lib/weather"
import type { SearchHit } from "@/lib/types"

export type Lookup = {
  hits: SearchHit[]
  searched: boolean
  searchFailed: boolean
  googleUrl?: string
  learn?: string[]
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
  hometown?: string,
  identity: PublicIdentity = {}
): Promise<Lookup> {
  const intended = intendedMeaning(text)
  const placeHint = hometown || identity.city
  const pageUrl = extractHttpUrl(intended)
  const query = force ? fallbackSearchQuery(intended) : searchQueryFor(intended)
  let hits: SearchHit[] = []
  let searched = false
  let searchFailed = false
  let googleUrl: string | undefined
  const learn: string[] = []

  const wantsSelf =
    isPersonalFactQuery(intended) && !isAgeQuery(intended)

  if (wantsSelf) {
    searched = true
    if (identity.github) {
      try {
        const github = await fetchGithubProfile(identity.github)
        if (github) {
          hits.push(github.hit)
          learn.push(...github.facts)
        }
      } catch {
        /* keep going */
      }
    }
    const selfQuery = selfLookupQuery(intended, identity)
    if (selfQuery) {
      googleUrl = googleSearchUrl(selfQuery)
      try {
        const web = await searchWeb(selfQuery)
        hits = uniqueBySnippet([...hits, ...web])
        learn.push(...factsFromHits(web, identity))
      } catch {
        if (!hits.length) searchFailed = true
      }
    } else if (!hasSearchableIdentity(identity)) {
      hits.push({
        title: "Look you up",
        snippet:
          "I can search public pages — GitHub, the web — and keep what I find. I need a name or GitHub handle first. Tell me, and I’ll look it up. I still won’t invent a CV from nothing.",
        source: "Maya",
        url: "",
      })
    }
  }

  if (isWeatherQuery(intended)) {
    searched = true
    const place = weatherPlace(intended, placeHint)
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
    const dest = mapsQuery(intended, placeHint)
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
    !hits.some(
      (hit) =>
        hit.source === "Weather" ||
        hit.source === "Maps" ||
        hit.source === "GitHub" ||
        hit.source === "Maya"
    )
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

  return {
    hits,
    searched,
    searchFailed,
    googleUrl,
    learn: [...new Set(learn.map((line) => line.trim()).filter(Boolean))].slice(
      0,
      8
    ),
  }
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
