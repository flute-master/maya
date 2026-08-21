import type { SearchHit } from "@/lib/types"

const UA =
  "MayaCompanion/0.1 (https://github.com/flute-master/maya; local personal companion)"

export function googleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`
}

export function googleMapsDirUrl(destination: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination.trim())}`
}

export async function lookupPlace(query: string): Promise<SearchHit | null> {
  const q = query.trim()
  if (q.length < 2) return null
  const maps = googleMapsSearchUrl(q)
  const dirs = googleMapsDirUrl(q)
  const osmSearch = `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=2`
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": UA },
    })
    if (response.ok) {
      const rows = (await response.json()) as Array<{
        display_name?: string
        lat?: string
        lon?: string
      }>
      const top = rows[0]
      if (top?.display_name) {
        const pin =
          top.lat && top.lon
            ? `https://www.openstreetmap.org/?mlat=${top.lat}&mlon=${top.lon}#map=16/${top.lat}/${top.lon}`
            : osmSearch
        return {
          title: top.display_name.split(",")[0] || q,
          snippet: [
            `I found ${top.display_name}.`,
            `I cannot drive Google Maps from here — open it:`,
            `Google Maps: ${maps}`,
            `Directions: ${dirs}`,
            `OpenStreetMap: ${pin}`,
          ].join("\n"),
          source: "Maps",
          url: maps,
        }
      }
    }
  } catch {
    /* fall through to links */
  } finally {
    clearTimeout(timer)
  }

  return {
    title: q,
    snippet: [
      `I cannot log into Google Maps, but I can drop you the links for ${q}:`,
      `Google Maps: ${maps}`,
      `Directions: ${dirs}`,
      `OpenStreetMap: ${osmSearch}`,
    ].join("\n"),
    source: "Maps",
    url: maps,
  }
}
