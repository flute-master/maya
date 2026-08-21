import { isPersonalFactQuery } from "@/lib/search"

const SKIP_NAMES = new Set([
  "master",
  "maya",
  "user",
  "friend",
  "there",
  "you",
])

export type PublicIdentity = {
  name?: string
  github?: string
  city?: string
}

function cleanName(raw: string) {
  const name = raw.replace(/\s+/g, " ").replace(/[.,;:]+$/g, "").trim()
  if (name.length < 2 || name.length > 60) return undefined
  if (SKIP_NAMES.has(name.toLowerCase())) return undefined
  return name
}

export function isAgeQuery(text: string) {
  return /\b(my age|how old am i|what('?s| is) my age)\b/i.test(text)
}

export function readPublicIdentity(
  pool: string[],
  callMe?: string
): PublicIdentity {
  const blob = pool.join("\n")
  const identity: PublicIdentity = {}

  const github =
    blob.match(/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)/i) ||
    blob.match(
      /\b(?:my )?github(?:\s+handle)?(?:\s+is|:)\s*@?([A-Za-z0-9-]+)/i
    )
  if (github?.[1] && github[1].toLowerCase() !== "github") {
    identity.github = github[1]
  }

  const named =
    blob.match(/\b(?:my name is|i'm called|i am called|i am)\s+([A-Za-z][A-Za-z' .-]{1,40})/i) ||
    blob.match(/\bcalled\s+([A-Za-z][A-Za-z' .-]{1,40})/i)
  if (named?.[1]) identity.name = cleanName(named[1])

  const city =
    blob.match(/\b(?:live in|based in|i'm from|i am from)\s+([A-Za-z][A-Za-z .'-]{2,40})/i)
  if (city?.[1]) identity.city = cleanName(city[1])

  if (!identity.name) {
    const fallback = cleanName(callMe || "")
    if (fallback) identity.name = fallback
  }

  return identity
}

export function hasSearchableIdentity(identity: PublicIdentity) {
  return Boolean(identity.name || identity.github)
}

export function selfLookupQuery(
  text: string,
  identity: PublicIdentity
): string | null {
  if (!isPersonalFactQuery(text)) return null
  if (isAgeQuery(text)) return null
  if (!hasSearchableIdentity(identity)) return null

  const who = [identity.name, identity.github].filter(Boolean).join(" ")
  const lower = text.toLowerCase()
  if (/\bskills?\b/.test(lower) || /what (are|is) my\b/.test(lower)) {
    return `${who} developer skills github linkedin`
  }
  if (/\b(job|work|career)\b/.test(lower)) {
    return `${who} job career`
  }
  if (/\blive\b|\bcity\b/.test(lower)) {
    return `${who} ${identity.city || ""} location`.trim()
  }
  if (/\bname\b/.test(lower)) {
    return who
  }
  return `${who}`
}
