import type { SearchHit } from "@/lib/types"
import type { PublicIdentity } from "@/lib/identity"

export function factsFromHits(
  hits: SearchHit[],
  identity: PublicIdentity
): string[] {
  const facts: string[] = []
  const markers = [identity.name, identity.github]
    .filter(Boolean)
    .map((value) => value!.toLowerCase())

  for (const hit of hits) {
    if (hit.source === "GitHub") continue
    const blob = `${hit.title} ${hit.snippet}`.toLowerCase()
    if (markers.length && !markers.some((mark) => blob.includes(mark))) continue
    if (hit.snippet.trim().length < 40) continue
    const compact = hit.snippet.replace(/\s+/g, " ").trim().slice(0, 180)
    facts.push(`Looked up (${hit.source}): ${compact}`)
    if (facts.length >= 3) break
  }
  return facts
}
