import type { SearchHit } from "@/lib/types"

const UA =
  "MayaCompanion/0.1 (https://github.com/flute-master/maya; local personal companion)"

function wttrUrl(place: string, extra: string) {
  const path = place.trim() ? encodeURIComponent(place.trim()) : ""
  return `https://wttr.in/${path}?m&${extra}`
}

export async function fetchWeather(place: string): Promise<SearchHit | null> {
  const label = place.trim() || "that city"
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 7000)
  try {
    const jsonRes = await fetch(wttrUrl(place, "format=j1"), {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": UA },
    })
    if (jsonRes.ok) {
      const data = (await jsonRes.json()) as {
        current_condition?: Array<{
          temp_C?: string
          FeelsLikeC?: string
          humidity?: string
          weatherDesc?: Array<{ value?: string }>
          windspeedKmph?: string
          precipMM?: string
        }>
        nearest_area?: Array<{
          areaName?: Array<{ value?: string }>
          country?: Array<{ value?: string }>
        }>
        weather?: Array<{
          maxtempC?: string
          mintempC?: string
          hourly?: Array<{ weatherDesc?: Array<{ value?: string }> }>
        }>
      }
      const now = data.current_condition?.[0]
      const area = data.nearest_area?.[0]
      const day = data.weather?.[0]
      if (now) {
        const city =
          area?.areaName?.[0]?.value ||
          label
        const country = area?.country?.[0]?.value
        const where = country ? `${city}, ${country}` : city
        const desc = now.weatherDesc?.[0]?.value || "Weather"
        const high = day?.maxtempC
        const low = day?.mintempC
        const range =
          high && low ? ` Today ${low}–${high}°C.` : ""
        const snippet = [
          `${where}: ${desc}, ${now.temp_C}°C (feels like ${now.FeelsLikeC}°C).`,
          `Humidity ${now.humidity}%, wind ${now.windspeedKmph} km/h, rain ${now.precipMM} mm.${range}`,
          "Live from wttr.in — not a guess.",
        ].join(" ")
        return {
          title: `Weather · ${where}`,
          snippet,
          source: "Weather",
          url: `https://wttr.in/${encodeURIComponent(city)}`,
        }
      }
    }

    const lineRes = await fetch(wttrUrl(place, "format=3"), {
      signal: controller.signal,
      headers: { "User-Agent": UA },
    })
    if (!lineRes.ok) return null
    const line = (await lineRes.text()).trim()
    if (!line || line.length < 4) return null
    return {
      title: `Weather · ${label}`,
      snippet: `${line} Live from wttr.in — not a guess.`,
      source: "Weather",
      url: `https://wttr.in/${encodeURIComponent(place.trim())}`,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
