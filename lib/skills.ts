import { intendedMeaning } from "@/lib/typos"

/** What Maya can actually do from a chat line — no Google login required. */

export function hometownFromNotes(notes: string[] | undefined): string | undefined {
  if (!notes?.length) return undefined
  for (const note of notes) {
    const match = note.match(
      /\b(?:live in|based in|i'm from|i am from)\s+([A-Za-z][A-Za-z .'-]{2,40})/i
    )
    if (match?.[1]) {
      const place = match[1].replace(/\s+/g, " ").trim()
      if (!/^(a|an|the|my|this)$/i.test(place)) return place
    }
  }
  return undefined
}

export function isWeatherQuery(text: string): boolean {
  const lower = intendedMeaning(text).toLowerCase()
  return /\b(weather|forecast|temperature|humidity|aqi|air quality|will it rain|is it raining|how hot|how cold)\b/.test(
    lower
  )
}

export function weatherPlace(text: string, hometown?: string): string | undefined {
  text = intendedMeaning(text)
  const match = text.match(
    /\b(?:weather|forecast|temperature|temp|rain|humidity|aqi)\b(?:\s+(?:like|today|now|tomorrow|outside))?[\s,]*(?:in|for|at|near)\s+(.+)$/i
  )
  if (match?.[1]) {
    return match[1]
      .replace(/\b(today|now|please|right now|right|tomorrow|currently)\b/gi, "")
      .replace(/[?.!]+$/g, "")
      .replace(/\s+/g, " ")
      .trim()
  }
  const city = text.match(
    /\b(?:in|for|at)\s+([A-Za-z][A-Za-z .'-]{2,40})$/i
  )
  if (city?.[1] && isWeatherQuery(text)) {
    return city[1].replace(/[?.!]+$/g, "").trim()
  }
  return hometown
}

const VAGUE_PLACE =
  /^(there|here|it|that|this|that place|this place|the place|same place|over there)$/i

export function isVaguePlace(place: string | undefined): boolean {
  return !place || VAGUE_PLACE.test(place.trim())
}

export function isDirectionsQuery(text: string): boolean {
  const lower = intendedMeaning(text).toLowerCase()
  return /\b(take me|directions?|navigate|route|how do i get|how to get|how to reach|way to|ways to|drive me|drop me|get me (there|to)|let'?s go|i want to go|bring me|uber me|take us|path to|towards)\b/.test(
    lower
  )
}

export function isMapsQuery(text: string): boolean {
  const lower = intendedMeaning(text).toLowerCase()
  return (
    isDirectionsQuery(lower) ||
    /\b(google maps|on (the )?map|show (me )?the map|where is .+ (located|on the map)|open (google )?maps)\b/.test(
      lower
    ) ||
    /^(map of|maps for|find on maps?)\b/.test(lower) ||
    /\b(metro station|railway station|bus stand|bus station|airport)\b/.test(lower) ||
    (/\bmetro\b/.test(lower) &&
      !/\b(comic|manga|anime|music|news)\b/.test(lower) &&
      lower.split(/\s+/).length <= 8)
  )
}

function tidyPlace(raw: string) {
  return raw
    .replace(/\b(please|by (car|bus|metro|walk|walking|bike)|from here|from my location)\b/gi, "")
    .replace(/[?.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function lastPlaceFromMessages(
  messages: Array<{ role?: string; content?: string }> | undefined
): string | undefined {
  if (!messages?.length) return undefined
  for (const message of [...messages].reverse()) {
    const text = String(message.content || "").trim()
    if (!text) continue
    const destParam = text.match(/[?&](?:destination|query)=([^&\s]+)/i)
    if (destParam?.[1]) {
      try {
        const place = tidyPlace(decodeURIComponent(destParam[1].replace(/\+/g, " ")))
        if (place.length > 1 && !/^https?:/i.test(place)) return place
      } catch {
        /* ignore bad encoding */
      }
    }
    const found = text.match(/\bI found ([^\n]+)/i)
    if (found?.[1]) {
      const place = tidyPlace(found[1].split(".")[0] || "")
      if (place.length > 1 && !/^https?:/i.test(place)) return place
    }
    const dest = mapsQuery(text)
    if (dest && !isVaguePlace(dest) && !/^https?:/i.test(dest)) return dest
  }
  return undefined
}

export function mapsQuery(
  text: string,
  hometown?: string,
  lastPlace?: string
): string | undefined {
  text = intendedMeaning(text)
  const dest = text.match(
    /\b(?:directions?|navigate|route|take me|take us|drive me|drop me|bring me|uber me|get me|how do i get|how to get|how to reach|way to|ways to|path to|towards|let'?s go|i want to go)\s+(?:to\s+)?(.+)$/i
  )
  if (dest?.[1]) {
    const place = tidyPlace(dest[1])
    if (isVaguePlace(place) || /^https?:/i.test(place)) return lastPlace || hometown
    return place || lastPlace || hometown
  }
  if (
    /^(take me there|take me|take us there|directions|navigate|let'?s go|get me there)\.?$/i.test(
      text.trim()
    )
  ) {
    return lastPlace || hometown
  }
  const mapped = text.match(
    /\b(?:map of|maps for|on (?:the )?map|google maps)\s*:?\s*(.+)$/i
  )
  if (mapped?.[1]) return tidyPlace(mapped[1])
  const where = text.match(/\bwhere is\s+(.+?)(?:\s+located|\s+on the map)?$/i)
  if (where?.[1]) {
    const place = tidyPlace(where[1])
    return hometown ? `${place}, ${hometown}` : place
  }
  if (
    /\b(metro|station|airport|bus stand)\b/i.test(text) &&
    text.trim().split(/\s+/).length <= 8
  ) {
    return tidyPlace(text)
  }
  return undefined
}

export function isClearScreenCommand(text: string): boolean {
  return /^(refresh|reload|clear(?:\s+(?:the\s+)?(?:screen|chat|thread))?|new chat|start over|reset chat)\.?$/i.test(
    intendedMeaning(text).trim()
  )
}

export function isJokeFollowUp(
  text: string,
  history?: Array<{ role?: string; content?: string }>
): boolean {
  const lower = intendedMeaning(text).trim().toLowerCase()
  if (
    /\b(another (one|joke|please)|tell another|one more( joke)?|worse|not funny|that sucked|try again|funnier|a better joke)\b/.test(
      lower
    )
  ) {
    return true
  }
  const recentJoke = (history ?? [])
    .slice(-8)
    .some((message) => {
      const line = intendedMeaning(String(message.content || "")).toLowerCase()
      if (message.role === "user") {
        return /\bjokes?\b|make me laugh|be funny/.test(line)
      }
      return false
    })
  if (!recentJoke) return false
  if (/^another\b/.test(lower) && lower.split(/\s+/).length <= 5) return true
  return /^(yes|yeah|yep|ok|okay|sure|more|again|lol|lmao|haha|another)[.!]?$/i.test(
    lower
  ) || /^(that'?s )?(terrible|bad|awful|lame|mid|not funny)[.!]?$/i.test(lower)
}

export function isCreativeQuery(text: string): boolean {
  const lower = intendedMeaning(text).toLowerCase()
  return (
    /\b(write|tell|make|give|create|spin)\b.{0,24}\b(story|stories|tale|joke|jokes|pun|puns|satire|roast|stand-?up)\b/.test(
      lower
    ) ||
    /^(a |another )?(story|joke|pun|satire)\b/.test(lower) ||
    /\b(tell me a joke|make me laugh|be funny|write a story|once upon|another joke)\b/.test(
      lower
    )
  )
}

export function creativeKind(
  text: string
): "story" | "joke" | "pun" | "satire" | null {
  if (!isCreativeQuery(text)) return null
  const lower = text.toLowerCase()
  if (/\b(satire|satirical|roast)\b/.test(lower)) return "satire"
  if (/\bpuns?\b/.test(lower)) return "pun"
  if (/\bjokes?\b|make me laugh|be funny|stand-?up/.test(lower)) return "joke"
  return "story"
}

export function creativeTopic(text: string): string {
  const match = text.match(
    /\b(?:about|on|regarding|involving)\s+(.+)$/i
  )
  if (match?.[1]) {
    return match[1].replace(/[?.!]+$/g, "").trim()
  }
  return ""
}

export function isPlannerQuery(text: string): boolean {
  const lower = intendedMeaning(text).toLowerCase()
  return (
    /\b(remind me|set a reminder|set reminder|set an? alarm|wake me|alarm for)\b/.test(
      lower
    ) ||
    /\b(add (a )?task|to-?do|my (task )?list|mark .{2,40} done)\b/.test(lower) ||
    /^(task|todo)[:\s]/.test(lower)
  )
}

export function shouldSkipWeb(text: string): boolean {
  return isCreativeQuery(text) || isPlannerQuery(text)
}
