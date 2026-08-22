import type { SearchHit } from "@/lib/types"

const UA =
  "MayaCompanion/0.1 (https://github.com/flute-master/maya; local personal companion)"

export type MapOrigin = { lat: number; lon: number } | { place: string }

export function googleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`
}

export function googleMapsDirUrl(destination: string, origin?: MapOrigin) {
  const params = new URLSearchParams({
    api: "1",
    destination: destination.trim(),
    travelmode: "driving",
  })
  if (origin && "lat" in origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lon)) {
    params.set("origin", `${origin.lat},${origin.lon}`)
  } else if (origin && "place" in origin && origin.place.trim()) {
    params.set("origin", origin.place.trim())
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function parseMapOrigin(args: {
  originLat?: string
  originLon?: string
  originPlace?: string
}): MapOrigin | undefined {
  const lat = Number(args.originLat)
  const lon = Number(args.originLon)
  if (Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0)) {
    return { lat, lon }
  }
  const place = args.originPlace?.trim()
  if (place) return { place }
  return undefined
}

export async function lookupPlace(
  query: string,
  options?: { origin?: MapOrigin; directions?: boolean }
): Promise<SearchHit | null> {
  const q = query.trim()
  if (q.length < 2) return null
  const directions = options?.directions !== false
  const maps = googleMapsSearchUrl(q)
  const dirs = googleMapsDirUrl(q, options?.origin)
  const primary = directions ? dirs : maps
  const osmSearch = `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`
  const fromHere = options?.origin
    ? "lat" in options.origin
      ? "I used this browser's location as the start."
      : `I started from ${options.origin.place}.`
    : "Google Maps will ask for your location when the window opens if I do not have a start point."

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
            fromHere,
            `I cannot drive the map — I open Google Maps for you:`,
            `Google Maps: ${primary}`,
            directions ? `Place pin: ${maps}` : `Directions: ${dirs}`,
            `OpenStreetMap: ${pin}`,
          ].join("\n"),
          source: "Maps",
          url: primary,
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
      `I cannot log into Google Maps, but I can open it for ${q}.`,
      fromHere,
      `Google Maps: ${primary}`,
      directions ? `Place pin: ${maps}` : `Directions: ${dirs}`,
      `OpenStreetMap: ${osmSearch}`,
    ].join("\n"),
    source: "Maps",
    url: primary,
  }
}
