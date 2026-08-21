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
  const lower = text.toLowerCase()
  return /\b(weather|forecast|temperature|humidity|aqi|air quality|will it rain|is it raining|how hot|how cold)\b/.test(
    lower
  )
}

export function weatherPlace(text: string, hometown?: string): string | undefined {
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

export function isMapsQuery(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    /\b(google maps|on (the )?map|show (me )?the map|directions? to|navigate to|route to|take me to|how do i get to|how to get to|where is .+ (located|on the map))\b/.test(
      lower
    ) ||
    /^(map of|maps for|find on maps?|open maps)\b/.test(lower)
  )
}

export function mapsQuery(text: string, hometown?: string): string | undefined {
  const dest = text.match(
    /\b(?:directions?|navigate|route|take me|how do i get|how to get)\s+(?:to\s+)?(.+)$/i
  )
  if (dest?.[1]) {
    return dest[1]
      .replace(/\b(please|by (car|bus|metro|walk|walking))\b/gi, "")
      .replace(/[?.!]+$/g, "")
      .trim()
  }
  const mapped = text.match(
    /\b(?:map of|maps for|on (?:the )?map|google maps)\s*:?\s*(.+)$/i
  )
  if (mapped?.[1]) return mapped[1].replace(/[?.!]+$/g, "").trim()
  const where = text.match(/\bwhere is\s+(.+?)(?:\s+located|\s+on the map)?$/i)
  if (where?.[1]) {
    const place = where[1].replace(/[?.!]+$/g, "").trim()
    return hometown ? `${place}, ${hometown}` : place
  }
  return undefined
}

export function isCreativeQuery(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    /\b(write|tell|make|give|create|spin)\b.{0,24}\b(story|stories|tale|joke|jokes|pun|puns|satire|roast|stand-?up)\b/.test(
      lower
    ) ||
    /^(a |another )?(story|joke|pun|satire)\b/.test(lower) ||
    /\b(tell me a joke|make me laugh|be funny|write a story|once upon)\b/.test(
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
  const lower = text.toLowerCase()
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
