import { calcExpr, isCalcQuery } from "@/lib/calc"
import { isFluteQuery } from "@/lib/flute"
import { isMindQuery } from "@/lib/mind"
import { isMusicQuery, musicQuery } from "@/lib/music"
import { extractHttpUrl } from "@/lib/search"
import { isNewsQuery, newsAsk } from "@/lib/news"
import { isOtakuQuery, otakuAsk } from "@/lib/otaku"
import {
  isDirectionsQuery,
  isMapsQuery,
  isWeatherQuery,
  mapsQuery,
  weatherPlace,
} from "@/lib/skills"
import { skipTinyNet } from "@/lib/trained"
import { intendedMeaning } from "@/lib/typos"
import type { ToolCall } from "@/lib/sage/types"

function pythonBlock(text: string): string | null {
  const fence = text.match(/```(?:python|py)\s*([\s\S]*?)```/i)
  if (fence?.[1]?.trim()) return fence[1].trim()
  const run = text.match(
    /\b(?:run|execute|eval)\s+(?:this\s+)?(?:python|code)\s*:?\s*([\s\S]+)$/i
  )
  if (run?.[1]?.trim() && run[1].trim().length < 4000) {
    return run[1].replace(/^```|```$/g, "").trim()
  }
  const print = text.match(/\bpython3?\s+-c\s+['"]([\s\S]+?)['"]\s*$/i)
  if (print?.[1]) return print[1]
  return null
}

function wantsPython(text: string) {
  const lower = text.toLowerCase()
  if (pythonBlock(text)) return true
  return (
    /\b(run python|execute python|in python|python sandbox)\b/.test(lower) ||
    /\b(analyze|plot|mean|average|sum of|count rows)\b.{0,40}\b(csv|tsv|json|data|file)\b/.test(
      lower
    )
  )
}

function mathAsPython(text: string): string | null {
  const expr = text.match(
    /(?:calculate|compute|what(?:'s| is))\s+([\d\s+\-*/().%]+)\??$/i
  )
  if (!expr?.[1]) return null
  const clean = expr[1].replace(/[^0-9+\-*/().% ]/g, "").trim()
  if (clean.length < 3) return null
  return `print(${clean})`
}

function writeTarget(text: string): { name: string; body: string } | null {
  const named = text.match(
    /\b(?:save|write|put)\s+(?:this|it|that)?\s*(?:as|to|into)\s+([A-Za-z0-9._\- ]+\.[A-Za-z0-9]+)\s*:?\s*([\s\S]+)$/i
  )
  if (named?.[1] && named[2] && named[2].trim().length > 0) {
    return { name: named[1].trim(), body: named[2].trim() }
  }
  return null
}

function readTarget(text: string): string | null {
  const match = text.match(
    /\b(?:read|open|show|cat|what's in|whats in)\s+(?:the\s+)?(?:file\s+)?([A-Za-z0-9._\- ]+\.[A-Za-z0-9]+)/i
  )
  return match?.[1]?.trim() || null
}

export function planTools(
  raw: string,
  hometown?: string,
  lastPlace?: string,
  origin?: { lat?: string; lon?: string; place?: string }
): ToolCall[] {
  const text = intendedMeaning(raw)
  const lower = text.toLowerCase()
  const calls: ToolCall[] = []
  const add = (call: ToolCall) => {
    if (!calls.some((item) => item.name === call.name && item.args.path === call.args.path && item.args.code === call.args.code && item.args.url === call.args.url)) {
      calls.push(call)
    }
  }

  const smallTalk =
    /^(hi|hey|hello|thanks|thank you|ok|okay|yo|good night|bye)\b/.test(lower) &&
    text.length < 48

  if (!smallTalk && text.length > 12 && !skipTinyNet(text)) {
    add({
      name: "recall",
      args: { query: text.slice(0, 240) },
      reason: "Search memory, chats, and files.",
      risk: "none",
    })
  }

  if (
    /\b(what(?:'s| is) in your (?:files|workspace)|list (?:your )?files|workspace)\b/.test(
      lower
    )
  ) {
    add({
      name: "files_list",
      args: {},
      reason: "List the sandbox workspace.",
      risk: "none",
    })
  }

  const read = readTarget(text)
  if (read) {
    add({
      name: "files_read",
      args: { path: read },
      reason: `Read ${read}.`,
      risk: "none",
    })
  }

  const write = writeTarget(text)
  if (write) {
    add({
      name: "files_write",
      args: { path: write.name, text: write.body.slice(0, 8000) },
      reason: `Write ${write.name} in the sandbox.`,
      risk: "write",
    })
  }

  if (isCalcQuery(text) && !pythonBlock(text)) {
    add({
      name: "calc",
      args: { expr: calcExpr(text) },
      reason: "Local calculator. No Python confirm.",
      risk: "none",
    })
  }

  if (isMusicQuery(text)) {
    add({
      name: "music",
      args: { query: musicQuery(text) },
      reason: "Find a YouTube play link.",
      risk: "net",
    })
  }

  const py = pythonBlock(text) || (wantsPython(text) ? mathAsPython(text) : null)
  if (py && !calls.some((item) => item.name === "calc")) {
    add({
      name: "python",
      args: { code: py },
      reason: "Run Python in the sandbox.",
      risk: "code",
    })
  } else if (
    /\b(analyze|summarise|summarize)\b.{0,30}\b(csv|tsv|json|file|data)\b/.test(
      lower
    )
  ) {
    add({
      name: "files_list",
      args: {},
      reason: "See which data files exist before analyzing.",
      risk: "none",
    })
    add({
      name: "python",
      args: {
        code: "import os, pathlib\nprint('files:', [p.name for p in pathlib.Path('.').iterdir() if p.is_file() and not p.name.startswith('.')])",
      },
      reason: "Inspect workspace files with Python.",
      risk: "code",
    })
  }

  if (isWeatherQuery(text)) {
    add({
      name: "weather",
      args: { place: weatherPlace(text, hometown) || hometown || "" },
      reason: "Live weather.",
      risk: "net",
    })
  }

  if (isNewsQuery(text)) {
    const ask = newsAsk(text, hometown)
    add({
      name: "news",
      args: {
        scope: ask.scope,
        place: ask.place || "",
        country: ask.country,
        topic: ask.topic || "",
      },
      reason: "Live headlines. Local, national, and world — not a guess.",
      risk: "net",
    })
  }

  if (isMapsQuery(text)) {
    const dest = mapsQuery(text, hometown, lastPlace)
    add({
      name: "maps",
      args: {
        query: dest || "",
        mode: isDirectionsQuery(text) ? "dir" : "search",
        originLat: origin?.lat || "",
        originLon: origin?.lon || "",
        originPlace: origin?.place || (!origin?.lat && hometown ? hometown : ""),
      },
      reason: "Open Google Maps. She cannot drive Chrome.",
      risk: "net",
    })
  }

  const url = extractHttpUrl(text)
  if (
    url &&
    /\b(fetch|read (this )?page|open this|summarize this url|what does this (page|site) say)\b/.test(
      lower
    )
  ) {
    add({
      name: "fetch_page",
      args: { url },
      reason: "Read the page text.",
      risk: "net",
    })
  }

  if (
    /\b(observe|what do you see|look at (my )?screen|screenshot|environment)\b/.test(
      lower
    )
  ) {
    add({
      name: "observe",
      args: {},
      reason: "Report files, memory, and any shared screen still.",
      risk: "none",
    })
  }

  const wantsGmail =
    /\b(gmail|inbox|unread (mail|email)|my e-?mails?|check (my )?(e-?mail|inbox)|send (an? )?(e-?mail|mail))\b/.test(
      lower
    )
  if (wantsGmail) {
    const sendTo = text.match(
      /\bsend (?:an? )?(?:e-?mail|mail|gmail) to\s+(\S+@\S+)/i
    )
    const subject = text.match(/\bsubject\s*[:\-]\s*(.+)$/i)
    add({
      name: "google_gmail",
      args: sendTo
        ? {
            action: "send",
            to: sendTo[1].replace(/[>,]+$/g, ""),
            subject: subject?.[1]?.trim() || "",
            body: text,
          }
        : { action: "list", query: /unread/.test(lower) ? "is:unread" : "in:inbox" },
      reason: sendTo
        ? `Send Gmail to ${sendTo[1]}.`
        : "Read Gmail on the connected account.",
      risk: sendTo ? "write" : "none",
    })
  }

  if (
    /\b(google calendar|gcal|what(?:'s| is) on my calendar|my calendar|calendar today|schedule (a |an )?(meeting|event)|add (an? )?(event|meeting) to (my )?(google )?calendar)\b/.test(
      lower
    )
  ) {
    const create =
      /\b(schedule|add (an? )?(event|meeting)|put .* on (my )?calendar|create (an? )?event)\b/.test(
        lower
      )
    add({
      name: "google_calendar",
      args: create
        ? { action: "create", title: text.replace(/^.*?:\s*/, "").slice(0, 180), query: text }
        : { action: "list", query: text },
      reason: create
        ? "Create a Google Calendar event."
        : "List Google Calendar events.",
      risk: create ? "write" : "none",
    })
  }

  if (
    /\b(google drive|files in drive|search drive|what's on my drive|whats on my drive)\b/.test(
      lower
    )
  ) {
    const q = text
      .replace(/.*\b(?:drive)\b[:\s]*/i, "")
      .replace(/^(search|find|list)\s+/i, "")
      .trim()
    add({
      name: "google_drive",
      args: { action: "list", query: q.slice(0, 120) },
      reason: "Search Google Drive.",
      risk: "none",
    })
  }

  if (
    /\b(google docs?|open (the )?(google )?doc|read (the )?(google )?doc)\b/.test(
      lower
    )
  ) {
    const q = text
      .replace(/.*\b(?:docs?|document)\b[:\s]*/i, "")
      .replace(/^(search|find|open|read)\s+/i, "")
      .trim()
    add({
      name: "google_docs",
      args: { action: "read", query: q.slice(0, 120) },
      reason: "Read a Google Doc.",
      risk: "none",
    })
  }

  if (/\b(google sheets?|spreadsheet)\b/.test(lower)) {
    const q = text
      .replace(/.*\b(?:sheets?|spreadsheet)\b[:\s]*/i, "")
      .replace(/^(search|find|open|read)\s+/i, "")
      .trim()
    add({
      name: "google_sheets",
      args: { action: "read", query: q.slice(0, 120) },
      reason: "Read a Google Sheet.",
      risk: "none",
    })
  }

  if (/\b(google tasks?|tasks? in google)\b/.test(lower)) {
    const addTask = /\b(add|create|put)\b/.test(lower)
    add({
      name: "google_tasks",
      args: addTask
        ? { action: "add", title: text.replace(/^.*?:\s*/, "").slice(0, 180) }
        : { action: "list" },
      reason: addTask ? "Add a Google Task." : "List Google Tasks.",
      risk: addTask ? "write" : "none",
    })
  }

  if (
    /\b(in my contacts|google contacts|look up .* in contacts)\b/.test(lower)
  ) {
    const who =
      text.match(/\bcontacts?\s+(?:for|named)?\s*(.+)$/i)?.[1] ||
      text.replace(/.*contacts\s*/i, "")
    add({
      name: "google_people",
      args: { action: "search", query: who.trim().slice(0, 80) },
      reason: "Search Google Contacts.",
      risk: "none",
    })
  }

  if (isOtakuQuery(text)) {
    const ask = otakuAsk(text)
    add({
      name: "otaku",
      args: {
        action: ask.action,
        query: ask.query.slice(0, 160),
        kind: ask.kind || "",
        progress: ask.progressNum != null ? String(ask.progressNum) : "",
      },
      reason:
        ask.action === "guide"
          ? "Mihon and official reading — not pirate repos."
          : ask.action === "updates"
            ? "Check AniList for official updates on the shelf."
            : "Official manga, novel, and episode links. Remember the shelf.",
      risk: ask.action === "guide" || ask.action === "list" ? "none" : "net",
    })
  }

  if (isMindQuery(text)) {
    add({
      name: "mind",
      args: { query: text.slice(0, 400) },
      reason: "Mind: facts, plans, or Analysis Chamber.",
      risk: "none",
    })
  }

  if (isFluteQuery(text) || /\.(wav|mp3|m4a|ogg|webm)\b/i.test(text)) {
    const hear =
      /\b(clip|recording|this (audio|file|take)|notes in (this|the)|transcribe|what notes)\b/i.test(
        lower
      ) || /\.(wav|mp3|m4a|ogg|webm)\b/i.test(text)
    const kinds = /\b(kinds?|types?|which flute|vs|piccolo|shakuhachi|dizi|concert flute)\b/i.test(
      lower
    )
    add({
      name: "flute",
      args: {
        action: hear ? "hear" : kinds ? "kinds" : "auto",
        query: text.slice(0, 240),
      },
      reason: hear
        ? "Read pitches from a flute clip."
        : kinds
          ? "Explain flute kinds."
          : "Flute notes or a lesson.",
      risk: "none",
    })
  }

  return calls.slice(0, 5)
}
