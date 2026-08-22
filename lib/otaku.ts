import { newId } from "@/lib/id"
import type { SearchHit } from "@/lib/types"

const UA =
  "MayaCompanion/0.1 (https://github.com/flute-master/maya; local personal companion)"

const ANILIST = "https://graphql.anilist.co"

export type OtakuKind = "manga" | "novel" | "anime"

export type ReadingItem = {
  id: string
  title: string
  kind: OtakuKind
  progress?: string
  progressNum?: number
  anilistId?: number
  siteUrl?: string
  updatedAt: number
}

export type OtakuAction = "search" | "track" | "updates" | "list" | "guide"

export type OtakuAsk = {
  action: OtakuAction
  query: string
  kind?: OtakuKind
  progressNum?: number
}

const LEGAL_SITES = /^(crunchyroll|netflix|hidive|amazon|hulu|disney|manga plus|mangaplus|viz|shonen jump|webtoon|tapas|bookwalker|book walker|j-novel|yen press|seven seas|kodansha|square enix|azuki|inkr|lezhin|tappytoon|manta|pocket comics|official site|twitter|x$|anilist|myanimelist|youtube|prime video|apple tv|max|bilibili|iqiyi|hotstar|aniwatch official)$/i

const PIRATE =
  /\b(9anime|gogoanime|gogo|zoro|aniwatch(?! official)|hianime|kissanime|wco|fmovies|mangakakalot|manganato|manganelo|asura|reaper scans|flame scans|batoto|bato\.to|nx\b|mangadex chapter|keiyoushi|tachiyomi-extensions)\b/i

export function isOtakuQuery(text: string): boolean {
  const lower = text.toLowerCase()
  if (/\b(flute|python|weather|calendar|gmail)\b/.test(lower)) return false
  return (
    /\b(manga|manhwa|manhua|anime|otaku|weeb|seinen|shounen|shonen|light novel|web novel|\bln\b|\bwn\b)\b/.test(
      lower
    ) ||
    /\b(tachiyomi|mihon|komga|kavita|anilist|myanimelist)\b/.test(lower) ||
    (/\b(chapter|episode|ch\.?\s*\d+|ep\.?\s*\d+)\b/.test(lower) &&
      /\b(read|watch|catch|caught|finished|reading|watching|shelf)\b/.test(
        lower
      )) ||
    /\b(where (can|do) i (read|watch)|manga links?|novel links?|episode links?)\b/.test(
      lower
    ) ||
    /\b(what am i (reading|watching)|my (manga|anime|novel)s?|any updates on (my )?(manga|anime|reading|shelf))\b/.test(
      lower
    ) ||
    /\b(extension repos?itor(y|ies)|manga repos?itor(y|ies))\b/.test(lower)
  )
}

export function otakuAsk(text: string): OtakuAsk {
  const lower = text.toLowerCase()
  const wantsGuide =
    /\b(tachiyomi|mihon|komga|kavita|extension repos?|manga repos?)\b/.test(lower) ||
    /\bhow (do|to) (i )?(read manga|use (a )?manga app)\b/.test(lower)
  const titleGuess = extractTitle(text)
  const hasTitle =
    titleGuess.length >= 2 &&
    !/^(otaku|anime|manga|manhwa|novel|links?)$/i.test(titleGuess)
  if (
    /\b(any updates|new (chapter|episode|ch|ep)|what(?:'s| is) new)\b/.test(lower) ||
    /\bupdates on (my )?(manga|anime|novels?|reading|shelf)\b/.test(lower)
  ) {
    return { action: "updates", query: text }
  }
  if (
    /\b(what am i (reading|watching)|my (manga|anime|novel)s?( list| shelf)?|show (my )?shelf)\b/.test(
      lower
    )
  ) {
    return { action: "list", query: text }
  }

  if (wantsGuide && !hasTitle) {
    return { action: "guide", query: text }
  }

  const kind = inferKind(lower)
  const progressNum = parseProgress(text)
  const title = titleGuess
  const tracking =
    /\b(i('?m| am) (reading|watching)|add |put |track |started |finished |caught up|on chapter|on episode|ch\.?\s*\d+|ep\.?\s*\d+)\b/.test(
      lower
    ) && Boolean(title)

  return {
    action: tracking ? "track" : "search",
    query: title || text.replace(/[?.!]+$/g, "").trim(),
    kind,
    progressNum,
  }
}

function inferKind(lower: string): OtakuKind | undefined {
  if (/\b(light novel|web novel|\bln\b|\bwn\b|novel)\b/.test(lower)) return "novel"
  if (/\b(anime|watch|episode|ep\.?\s*\d+|season)\b/.test(lower)) return "anime"
  if (/\b(manga|manhwa|manhua|read|chapter|ch\.?\s*\d+)\b/.test(lower)) return "manga"
  return undefined
}

function parseProgress(text: string): number | undefined {
  const match = text.match(/\b(?:ch(?:apter)?|ep(?:isode)?)\.?\s*(\d{1,5})\b/i)
  if (!match?.[1]) return undefined
  const n = Number(match[1])
  return Number.isFinite(n) ? n : undefined
}

function extractTitle(text: string): string {
  const quoted = text.match(/["“](.+?)["”]/)
  if (quoted?.[1]) return quoted[1].trim()
  const after = text.match(
    /\b(?:read|watch|reading|watching|manga|manhwa|anime|novel|ln)\s+(?:called |named |titled )?(?:the )?(?:links? (?:for|to) )?(?:me )?(?:some )?(?:of )?(.+)$/i
  )
  let raw = after?.[1] || text
  raw = raw
    .replace(
      /\b(where can i (read|watch)|manga links?|novel links?|episode links?|look up|search|add|track|put|started|finished|caught up|i('?m| am) (reading|watching)|please|for me)\b/gi,
      " "
    )
    .replace(/\b(on )?(chapter|ch\.?|episode|ep\.?)\s*\d+\b/gi, " ")
    .replace(/\b(legally|official|links?|please)\b/gi, " ")
    .replace(/\b(also explain|vs\.? tachiyomi|vs\.? mihon)\b[\s\S]*$/i, " ")
    .replace(/\band watch\b[\s\S]*$/i, " ")
    .replace(/[?.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return raw
}

export function formatShelfLine(item: ReadingItem) {
  const progress = item.progress ? ` - ${item.progress}` : ""
  const id = item.anilistId ? ` [al:${item.anilistId}]` : ""
  return `${item.kind}: ${item.title}${progress}${id}`
}

export function parseShelfLines(lines: string[] | undefined): ReadingItem[] {
  if (!lines?.length) return []
  const items: ReadingItem[] = []
  for (const line of lines) {
    const match = line.match(
      /^(manga|novel|anime):\s*(.+?)(?:\s+-\s+(chapter|episode)\s+(\d+))?(?:\s+\[al:(\d+)\])?$/i
    )
    if (!match) continue
    const kind = match[1].toLowerCase() as OtakuKind
    const title = match[2].trim()
    const n = match[4] ? Number(match[4]) : undefined
    const anilistId = match[5] ? Number(match[5]) : undefined
    items.push({
      id: anilistId ? `al-${anilistId}` : newId(),
      title,
      kind,
      progress:
        n && match[3]
          ? `${match[3][0].toUpperCase()}${match[3].slice(1)} ${n}`
          : undefined,
      progressNum: n,
      anilistId,
      siteUrl: anilistId ? `https://anilist.co/${kind === "anime" ? "anime" : "manga"}/${anilistId}` : undefined,
      updatedAt: 0,
    })
  }
  return items
}

const GUIDE = [
  "Tachiyomi shut down in 2024. Do not install random “Tachiyomi JY” APKs.",
  "Mihon is the current open-source reader: https://github.com/mihonapp/mihon/releases",
  "I will not give you pirate extension repositories. Those steal from authors. The “repo” people mean is usually that.",
  "Legal ways I can actually help:",
  "• I keep your shelf here. Tell me the title and chapter or episode. Ask “any updates on my manga”.",
  "• Official read: Manga Plus, VIZ Shonen Jump, WEBTOON, Tapas. Ask “where can I read Frieren”.",
  "• Official novels: BookWalker, J-Novel Club. Originals: Royal Road. I do not dump novel text.",
  "• Official watch: Crunchyroll, Netflix, HIDIVE — I drop the episode page when AniList lists it.",
  "• If you own CBZ/PDF: Mihon Local source, or Komga / Kavita on your laptop. That is the honest repository — your files.",
  "Tracking: I use AniList. You can also keep an AniList account. I remember where you left off on this machine.",
].join("\n")

type AniMedia = {
  id: number
  type?: string
  format?: string
  status?: string
  chapters?: number | null
  episodes?: number | null
  siteUrl?: string
  title?: { romaji?: string; english?: string; native?: string }
  nextAiringEpisode?: {
    episode?: number
    timeUntilAiring?: number
    airingAt?: number
  } | null
  externalLinks?: Array<{ url?: string; site?: string; type?: string }> | null
}

function displayTitle(media: AniMedia) {
  return (
    media.title?.english ||
    media.title?.romaji ||
    media.title?.native ||
    "Untitled"
  )
}

function kindOf(media: AniMedia): OtakuKind {
  if (media.type === "ANIME") return "anime"
  if (media.format === "NOVEL") return "novel"
  return "manga"
}

function legalLinks(media: AniMedia) {
  const links: Array<{ site: string; url: string }> = []
  const seen = new Set<string>()
  for (const link of media.externalLinks ?? []) {
    const site = (link.site || "").trim()
    const url = (link.url || "").trim()
    if (!site || !url || !/^https?:\/\//i.test(url)) continue
    if (PIRATE.test(site) || PIRATE.test(url)) continue
    if (!LEGAL_SITES.test(site) && link.type !== "STREAMING") continue
    if (link.type === "STREAMING" && PIRATE.test(url)) continue
    const key = url.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    links.push({ site, url })
  }
  links.unshift({ site: "AniList", url: media.siteUrl || `https://anilist.co` })
  return links.slice(0, 7)
}

function airingLine(media: AniMedia) {
  const next = media.nextAiringEpisode
  if (!next?.episode) return ""
  const wait = next.timeUntilAiring ?? 0
  const hours = Math.max(1, Math.round(wait / 3600))
  const when =
    hours < 48 ? `in about ${hours} hour${hours === 1 ? "" : "s"}` : `in about ${Math.round(hours / 24)} days`
  return `Next official episode: Ep ${next.episode} ${when}.`
}

function formatMedia(media: AniMedia, progressNum?: number) {
  const title = displayTitle(media)
  const kind = kindOf(media)
  const counts =
    kind === "anime"
      ? media.episodes
        ? `${media.episodes} episodes listed`
        : "Episode count not listed yet"
      : media.chapters
        ? `${media.chapters} chapters listed`
        : "Chapter count not listed yet (AniList often lags on weeklies)"
  const behind =
    progressNum &&
    ((kind === "anime" && media.episodes && progressNum < media.episodes) ||
      (kind !== "anime" && media.chapters && progressNum < media.chapters))
      ? ` You told me you are on ${kind === "anime" ? "episode" : "chapter"} ${progressNum}.`
      : progressNum
        ? ` I have you on ${kind === "anime" ? "episode" : "chapter"} ${progressNum}.`
        : ""
  const links = legalLinks(media)
    .map((link) => `• ${link.site}: ${link.url}`)
    .join("\n")
  const air = airingLine(media)
  return [
    `${title} (${kind}${media.status ? `, ${media.status.toLowerCase()}` : ""})`,
    counts + behind,
    air,
    "Official / catalog links — not scanlation or stream-rips:",
    links,
  ]
    .filter(Boolean)
    .join("\n")
}

async function anilist(query: string, variables: Record<string, unknown>) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(ANILIST, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": UA,
      },
      body: JSON.stringify({ query, variables }),
    })
    if (!response.ok) return null
    return (await response.json()) as { data?: unknown }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function searchMedia(title: string, kind?: OtakuKind): Promise<AniMedia[]> {
  const q = `
    query ($search: String, $type: MediaType) {
      Page(page: 1, perPage: 3) {
        media(search: $search, type: $type, sort: SEARCH_MATCH) {
          id type format status chapters episodes siteUrl
          title { romaji english native }
          nextAiringEpisode { episode timeUntilAiring airingAt }
          externalLinks { url site type }
        }
      }
    }
  `
  const types: Array<"ANIME" | "MANGA"> =
    kind === "anime" ? ["ANIME"] : kind === "manga" || kind === "novel" ? ["MANGA"] : ["ANIME", "MANGA"]
  const found: AniMedia[] = []
  for (const type of types) {
    const data = await anilist(q, { search: title.slice(0, 80), type })
    const page = data?.data as { Page?: { media?: AniMedia[] } } | undefined
    for (const media of page?.Page?.media ?? []) {
      if (kind === "novel" && media.format && media.format !== "NOVEL") continue
      found.push(media)
    }
  }
  const seen = new Set<number>()
  return found.filter((media) => {
    if (seen.has(media.id)) return false
    seen.add(media.id)
    return true
  })
}

async function mediaById(id: number): Promise<AniMedia | null> {
  const q = `
    query ($id: Int) {
      Media(id: $id) {
        id type format status chapters episodes siteUrl
        title { romaji english native }
        nextAiringEpisode { episode timeUntilAiring airingAt }
        externalLinks { url site type }
      }
    }
  `
  const data = await anilist(q, { id })
  const media = (data?.data as { Media?: AniMedia } | undefined)?.Media
  return media ?? null
}

export function readingFromMedia(
  media: AniMedia,
  progressNum?: number
): ReadingItem {
  const kind = kindOf(media)
  const unit = kind === "anime" ? "Episode" : "Chapter"
  return {
    id: `al-${media.id}`,
    title: displayTitle(media),
    kind,
    anilistId: media.id,
    siteUrl: media.siteUrl,
    progressNum,
    progress: progressNum ? `${unit} ${progressNum}` : undefined,
    updatedAt: Date.now(),
  }
}

export async function runOtaku(
  ask: OtakuAsk,
  shelf: ReadingItem[]
): Promise<{
  hit: SearchHit
  reading?: ReadingItem[]
}> {
  if (ask.action === "guide") {
    return {
      hit: {
        title: "How to read — Mihon, not pirate repos",
        snippet: GUIDE,
        source: "Otaku",
        url: "https://github.com/mihonapp/mihon/releases",
      },
    }
  }

  if (ask.action === "list") {
    if (!shelf.length) {
      return {
        hit: {
          title: "Your shelf",
          snippet:
            "Shelf is empty. Tell me what you are reading or watching — “I’m reading Frieren chapter 12” — and I will keep it. I can then check official updates.",
          source: "Otaku",
          url: "",
        },
      }
    }
    const lines = shelf
      .slice(0, 20)
      .map((item) => `• ${formatShelfLine(item)}${item.siteUrl ? `\n  ${item.siteUrl}` : ""}`)
    return {
      hit: {
        title: `Your shelf (${shelf.length})`,
        snippet: `${lines.join("\n")}\n\nAsk “any updates on my manga” or “where can I watch Frieren”.`,
        source: "Otaku",
        url: "",
      },
    }
  }

  if (ask.action === "updates") {
    if (!shelf.length) {
      return {
        hit: {
          title: "Updates",
          snippet:
            "I do not have a shelf yet. Name a title and where you left off. Then I can check AniList for new official episodes and listed chapter counts.",
          source: "Otaku",
          url: "",
        },
      }
    }
    const blocks: string[] = []
    for (const item of shelf.slice(0, 8)) {
      const media = item.anilistId
        ? await mediaById(item.anilistId)
        : (await searchMedia(item.title, item.kind))[0]
      if (!media) {
        blocks.push(`${item.title} — AniList did not answer. Try again in a minute.`)
        continue
      }
      blocks.push(formatMedia(media, item.progressNum))
    }
    return {
      hit: {
        title: "Updates on your shelf",
        snippet: `${blocks.join("\n\n")}\n\nLive from AniList — not a scanlation feed.`,
        source: "Otaku",
        url: shelf[0]?.siteUrl || "https://anilist.co",
      },
    }
  }

  const title = ask.query.trim()
  if (title.length < 2) {
    return {
      hit: {
        title: "Otaku",
        snippet:
          "Name a manga, novel, or anime. I will find official links and remember where you left off. I do not hand out pirate chapter or episode rips.",
        source: "Otaku",
        url: "",
      },
    }
  }

  const found = await searchMedia(title, ask.kind)
  if (!found.length) {
    return {
      hit: {
        title: `No AniList match for ${title}`,
        snippet:
          "AniList did not return that title. Check the spelling, or try the English name. I still will not invent a pirate link.",
        source: "Otaku",
        url: `https://anilist.co/search/anime?search=${encodeURIComponent(title)}`,
      },
    }
  }

  const reading =
    ask.action === "track"
      ? [readingFromMedia(found[0], ask.progressNum)]
      : undefined
  const tracked = reading
    ? `\n\nI put ${displayTitle(found[0])} on your shelf${
        ask.progressNum
          ? ` at ${kindOf(found[0]) === "anime" ? "episode" : "chapter"} ${ask.progressNum}`
          : ""
      }. Ask for updates anytime.`
    : ""

  return {
    hit: {
      title:
        ask.action === "track"
          ? `On your shelf: ${displayTitle(found[0])}`
          : `Official links: ${displayTitle(found[0])}`,
      snippet: `${found.map((media) => formatMedia(media, ask.progressNum)).join("\n\n")}${tracked}\n\nLive from AniList. Official pages only.`,
      source: "Otaku",
      url: found[0].siteUrl || "",
    },
    reading,
  }
}

export function isReadingItem(value: unknown): value is ReadingItem {
  if (!value || typeof value !== "object") return false
  const item = value as ReadingItem
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    (item.kind === "manga" || item.kind === "novel" || item.kind === "anime")
  )
}

export function upsertReading(list: ReadingItem[], next: ReadingItem) {
  const key = (item: ReadingItem) =>
    String(item.anilistId || item.title.toLowerCase())
  const rest = list.filter((item) => key(item) !== key(next))
  return [next, ...rest].slice(0, 40)
}
