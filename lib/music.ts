import { searchWeb } from "@/lib/search"

export type MusicTrack = {
  title: string
  videoId?: string
  url: string
  embed?: string
  source: string
}

const UA =
  "MayaCompanion/0.1 (https://github.com/flute-master/maya; local personal companion)"

const PIPED = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.reallyaweso.me",
]

const INVIDIOUS = [
  "https://yewtu.be",
  "https://invidious.nerdvpn.de",
]

export function isMusicQuery(text: string): boolean {
  const lower = text.toLowerCase().trim()
  if (/\bflute\b/.test(lower) || /\bpython\b/.test(lower)) return false
  if (
    /^(play|music|song|youtube)$/.test(lower) ||
    /^open (the )?(music player|youtube|player)\b/.test(lower)
  ) {
    return true
  }
  return (
    /\b(put on|listen to|music player|now playing|youtube)\b/.test(lower) ||
    /\bplay\s+\S+/.test(lower)
  )
}

export function musicQuery(text: string): string {
  const url = text.match(
    /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/i
  )
  if (url?.[1]) return url[0]
  const after = text.match(
    /\b(?:play|put on|listen to|youtube|song)\s+(?:me\s+)?(?:the\s+)?(?:song\s+)?(.+)$/i
  )
  if (after?.[1]) {
    return after[1]
      .replace(/\b(on youtube|please|for me)\b/gi, "")
      .replace(/[?.!]+$/g, "")
      .trim()
  }
  return text.replace(/[?.!]+$/g, "").trim()
}

export function youtubeWatchUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`
}

export function youtubeEmbedUrl(id: string, autoplay = false) {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1" })
  if (autoplay) params.set("autoplay", "1")
  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}

export function youtubeSearchUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`
}

function trackFromId(id: string, title: string, source: string): MusicTrack {
  return {
    title: title || id,
    videoId: id,
    url: youtubeWatchUrl(id),
    embed: youtubeEmbedUrl(id),
    source,
  }
}

function videoIdFromUrl(url: string): string | undefined {
  const watch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/)
  if (watch?.[1]) return watch[1]
  const short = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)
  return short?.[1]
}

async function fetchJson(url: string, ms = 5000): Promise<unknown | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": UA },
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function fromPiped(query: string): Promise<MusicTrack | null> {
  for (const base of PIPED) {
    const data = (await fetchJson(
      `${base}/search?q=${encodeURIComponent(query)}&filter=videos`
    )) as Array<{ title?: string; url?: string; id?: string }> | null
    const row = data?.find((item) => item.id || item.url)
    const id = row?.id || (row?.url ? videoIdFromUrl(row.url) : undefined)
    if (id) return trackFromId(id, row?.title || query, "Piped")
  }
  return null
}

async function fromInvidious(query: string): Promise<MusicTrack | null> {
  for (const base of INVIDIOUS) {
    const data = (await fetchJson(
      `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`
    )) as Array<{ title?: string; videoId?: string }> | null
    const row = data?.find((item) => item.videoId)
    if (row?.videoId) return trackFromId(row.videoId, row.title || query, "Invidious")
  }
  return null
}

async function fromYoutubeHtml(query: string): Promise<MusicTrack | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const response = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`,
      {
        signal: controller.signal,
        headers: { "User-Agent": UA, Accept: "text/html" },
      }
    )
    if (!response.ok) return null
    const html = await response.text()
    const id = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/)?.[1]
    const title = html.match(/"title":\{"runs":\[\{"text":"([^"]+)"\}\]/)?.[1]
    if (id) return trackFromId(id, title || query, "YouTube")
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
  return null
}

async function fromDuckDuckGo(query: string): Promise<MusicTrack | null> {
  const hits = await searchWeb(`${query} site:youtube.com`).catch(() => [])
  for (const hit of hits) {
    const id = videoIdFromUrl(hit.url)
    if (id) return trackFromId(id, hit.title || query, "DuckDuckGo")
  }
  return null
}

export async function findSong(query: string): Promise<MusicTrack> {
  const q = query.trim()
  if (q.length < 1) {
    return {
      title: "Name a song",
      url: youtubeSearchUrl("music"),
      source: "YouTube",
    }
  }
  const pasted = videoIdFromUrl(q)
  if (pasted) {
    return trackFromId(pasted, q, "YouTube")
  }

  const found = await Promise.any([
    fromPiped(q).then((track) => track || Promise.reject(new Error("piped"))),
    fromInvidious(q).then((track) => track || Promise.reject(new Error("invidious"))),
    fromYoutubeHtml(q).then((track) => track || Promise.reject(new Error("html"))),
  ]).catch(async () => fromDuckDuckGo(q))

  if (found) return found

  const search = youtubeSearchUrl(q)
  return {
    title: q,
    url: search,
    source: "YouTube search",
  }
}

export function musicReply(track: MusicTrack) {
  const lines = [
    track.videoId
      ? `Playing: ${track.title}`
      : `I could not pin one video. Open the YouTube search for “${track.title}”.`,
    `YouTube: ${track.url}`,
  ]
  if (track.embed) lines.push(`Player: ${track.embed}`)
  lines.push("I cannot stream Spotify or Apple Music from here — YouTube is the free player.")
  return { summary: track.title, detail: lines.join("\n"), url: track.url, track }
}
