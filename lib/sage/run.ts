import type { PublicIdentity } from "@/lib/identity"
import { lookupWeb } from "@/lib/lookup"
import { readWebPage } from "@/lib/search"
import type { MemoryContext } from "@/lib/types"
import { evaluateCalc } from "@/lib/calc"
import { findSong, musicReply } from "@/lib/music"
import { lookupPlace, parseMapOrigin } from "@/lib/maps"
import { fetchNews, type NewsAsk } from "@/lib/news"
import {
  parseShelfLines,
  runOtaku,
  type OtakuAction,
  type OtakuKind,
} from "@/lib/otaku"
import { fetchWeather } from "@/lib/weather"
import {
  listWorkspace,
  readWorkspaceFile,
  textFilesForIndex,
  writeWorkspaceFile,
} from "@/lib/sage/files"
import { planTools } from "@/lib/sage/plan"
import { runPython } from "@/lib/sage/python"
import type {
  PendingConfirm,
  SageRun,
  SageTrust,
  ToolApproval,
  ToolCall,
  ToolResult,
} from "@/lib/sage/types"
import { runFluteTool } from "@/lib/flute"
import { runGoogleTool } from "@/lib/google/apps"
import { googleStatus } from "@/lib/google/auth"
import { indexDocuments, retrieve } from "@/lib/sage/vectors"
import { mindAsk, runMind } from "@/lib/mind"

function approved(call: ToolCall, granted: ToolApproval[]) {
  return granted.some((item) => item.name === call.name)
}

function needsAsk(call: ToolCall, trust: SageTrust) {
  if (call.name.startsWith("google_") && call.risk === "write") {
    return !trust.allowGoogleWrite
  }
  if (call.risk === "code") return !trust.allowPython
  if (call.risk === "write") return !trust.allowFileWrite
  if (call.risk === "net") return !trust.allowSearch
  return false
}

export async function refreshVectors(memory?: MemoryContext) {
  const files = await textFilesForIndex().catch(() => [])
  const notes = (memory?.notes ?? []).map((text, i) => ({
    id: `note:${i}`,
    kind: "note" as const,
    text,
  }))
  const chats = (memory?.priorUserLines ?? []).map((text, i) => ({
    id: `chat:${i}`,
    kind: "chat" as const,
    text,
  }))
  await indexDocuments([...notes, ...chats, ...files]).catch(() => 0)
}

async function execute(
  call: ToolCall,
  input: {
    hometown?: string
    identity?: PublicIdentity
    memory?: MemoryContext
  }
): Promise<ToolResult> {
  try {
    if (call.name === "recall") {
      const hits = await retrieve(call.args.query || "", 5)
      return {
        name: "recall",
        ok: true,
        summary: hits.length
          ? `Remembered ${hits.length} related bits.`
          : "Nothing close in the vector store yet.",
        detail: hits.join("\n"),
      }
    }
    if (call.name === "weather") {
      const place = call.args.place || input.hometown || ""
      const hit = await fetchWeather(place)
      if (!hit) {
        return { name: "weather", ok: false, summary: "Weather lookup failed." }
      }
      return {
        name: "weather",
        ok: true,
        summary: hit.title,
        detail: hit.snippet,
      }
    }
    if (call.name === "news") {
      const ask: NewsAsk = {
        scope: (call.args.scope as NewsAsk["scope"]) || "briefing",
        place: call.args.place || input.hometown || "",
        country: call.args.country || "IN",
        topic: call.args.topic || "",
      }
      const hit = await fetchNews(ask)
      if (!hit) {
        return { name: "news", ok: false, summary: "News lookup failed." }
      }
      return {
        name: "news",
        ok: true,
        summary: hit.title,
        detail: hit.snippet,
        url: hit.url,
      }
    }
    if (call.name === "maps") {
      const dest = (call.args.query || "").trim()
      if (dest.length < 2) {
        return {
          name: "maps",
          ok: false,
          summary:
            "Where should I take you? Name a place, or say “take me to Charminar”. I can use this browser's location as the start.",
        }
      }
      const hit = await lookupPlace(dest, {
        origin: parseMapOrigin(call.args),
        directions: call.args.mode !== "search",
      })
      if (!hit) {
        return { name: "maps", ok: false, summary: "Could not build map links." }
      }
      return {
        name: "maps",
        ok: true,
        summary: hit.title,
        detail: hit.snippet,
        url: hit.url,
      }
    }
    if (call.name === "calc") {
      const result = evaluateCalc(call.args.expr || "")
      if (!result.ok) {
        return { name: "calc", ok: false, summary: result.error }
      }
      return {
        name: "calc",
        ok: true,
        summary: result.text,
        detail: `${call.args.expr || "expression"} = ${result.text}`,
      }
    }
    if (call.name === "music") {
      const track = await findSong(call.args.query || "")
      const reply = musicReply(track)
      return {
        name: "music",
        ok: Boolean(track.url),
        summary: reply.summary,
        detail: reply.detail,
        url: reply.url,
      }
    }
    if (call.name === "fetch_page") {
      const hit = await readWebPage(call.args.url || "")
      if (!hit) {
        return { name: "fetch_page", ok: false, summary: "Could not read that URL." }
      }
      return {
        name: "fetch_page",
        ok: true,
        summary: hit.title,
        detail: hit.snippet,
      }
    }
    if (call.name === "lookup") {
      const looked = await lookupWeb(
        call.args.query || "",
        true,
        input.hometown,
        input.identity
      )
      const first = looked.hits[0]
      return {
        name: "lookup",
        ok: Boolean(first),
        summary: first ? first.title : "Lookup returned nothing.",
        detail: looked.hits
          .slice(0, 3)
          .map((hit) => hit.snippet)
          .join("\n"),
      }
    }
    if (call.name === "files_list") {
      const rows = await listWorkspace()
      const lines = rows.length
        ? rows.map((row) => `${row.name} (${row.bytes} bytes, ${row.kind})`)
        : ["Workspace is empty. Drop a file or share a screen still."]
      return {
        name: "files_list",
        ok: true,
        summary: rows.length ? `${rows.length} files in the workspace.` : "Empty workspace.",
        detail: lines.join("\n"),
      }
    }
    if (call.name === "files_read") {
      const file = await readWorkspaceFile(call.args.path || "")
      return {
        name: "files_read",
        ok: true,
        summary: `Read ${file.name} (${file.bytes} bytes).`,
        detail: file.text.slice(0, 3500),
      }
    }
    if (call.name === "files_write") {
      const saved = await writeWorkspaceFile(
        call.args.path || "note.txt",
        call.args.text || ""
      )
      return {
        name: "files_write",
        ok: true,
        summary: `Wrote ${saved.name} (${saved.bytes} bytes).`,
      }
    }
    if (call.name === "python") {
      const ran = await runPython(call.args.code || "")
      const body = [ran.stdout.trim(), ran.stderr.trim() ? `stderr:\n${ran.stderr.trim()}` : ""]
        .filter(Boolean)
        .join("\n")
      return {
        name: "python",
        ok: ran.ok,
        summary: ran.ok ? "Python finished." : "Python failed or timed out.",
        detail: body || "(no output)",
      }
    }
    if (call.name === "mind") {
      const ran = await runMind({
        ask: mindAsk(call.args.query || ""),
        facts: input.memory?.mindFacts ?? [],
        notes: input.memory?.notes ?? [],
        reminders: input.memory?.reminders ?? [],
        tasks: input.memory?.tasks ?? [],
        plans: input.memory?.mindPlans ?? [],
      })
      return {
        name: "mind",
        ok: true,
        summary:
          ran.plan
            ? `Plan: ${ran.plan.goal}`
            : ran.removed?.length
              ? `Forgot ${ran.removed.length} fact${ran.removed.length === 1 ? "" : "s"}.`
              : "Mind.",
        detail: ran.text,
        facts: ran.facts,
        plan: ran.plan,
      }
    }
    if (call.name === "observe") {
      const rows = await listWorkspace()
      const images = rows.filter((row) => row.kind === "image")
      const latest = images.at(-1)
      const bits = [
        `Workspace files: ${rows.length}.`,
        latest
          ? `Latest still: ${latest.name}. I stored the pixels. I cannot see them without a vision model — tell me what is on screen, or ask Python to inspect the file.`
          : "No screenshot yet. Use the monitor button to share a frame.",
        `${input.memory?.notes?.length ?? 0} memory notes on disk.`,
      ]
      return {
        name: "observe",
        ok: true,
        summary: "Environment snapshot.",
        detail: bits.join(" "),
      }
    }
    if (call.name === "otaku") {
      const action = (call.args.action || "search") as OtakuAction
      const kind = (call.args.kind || "") as OtakuKind | ""
      const progress = Number(call.args.progress)
      const ran = await runOtaku(
        {
          action,
          query: call.args.query || "",
          kind: kind || undefined,
          progressNum: Number.isFinite(progress) && progress > 0 ? progress : undefined,
        },
        parseShelfLines(input.memory?.reading)
      )
      return {
        name: "otaku",
        ok: true,
        summary: ran.hit.title,
        detail: ran.hit.snippet,
        url: ran.hit.url,
        reading: ran.reading,
      }
    }
    if (call.name === "flute") {
      const ran = await runFluteTool(call.args)
      return {
        name: "flute",
        ok: ran.ok,
        summary: ran.summary,
        detail: ran.detail,
      }
    }
    if (call.name.startsWith("google_")) {
      const ran = await runGoogleTool(call.name, call.args)
      return {
        name: call.name,
        ok: ran.ok,
        summary: ran.summary,
        detail: ran.detail,
      }
    }
    return { name: call.name, ok: false, summary: "Unknown tool." }
  } catch (caught) {
    return {
      name: call.name,
      ok: false,
      summary: caught instanceof Error ? caught.message : "Tool failed.",
    }
  }
}

export async function runSage(input: {
  text: string
  memory?: MemoryContext
  hometown?: string
  lastPlace?: string
  origin?: { lat?: string; lon?: string; place?: string }
  identity?: PublicIdentity
  trust: SageTrust
  approved?: ToolApproval[]
}): Promise<SageRun> {
  const calls = planTools(input.text, input.hometown, input.lastPlace, input.origin)
  if (calls.some((call) => call.name === "recall")) {
    await refreshVectors(input.memory)
  }
  const granted = input.approved ?? []
  const pending: PendingConfirm[] = []
  const runnable: ToolCall[] = []
  const status = calls.some((call) => call.name.startsWith("google_"))
    ? await googleStatus()
    : null
  for (const call of calls) {
    if (needsAsk(call, input.trust) && !approved(call, granted)) {
      const googleReady =
        call.name === "google_gmail"
          ? Boolean(status?.canGmail)
          : call.name === "google_calendar"
            ? Boolean(status?.canCalendar)
            : call.name === "google_tasks"
              ? Boolean(status?.canTasks)
              : call.name.startsWith("google_")
                ? Boolean(status?.canDrive)
                : true
      if (call.name.startsWith("google_") && !googleReady) {
        runnable.push(call)
        continue
      }
      pending.push({
        name: call.name,
        args: call.args,
        reason: call.reason,
        risk: call.risk,
      })
    } else if (call.risk === "net" && !input.trust.allowSearch) {
      pending.push({
        name: call.name,
        args: call.args,
        reason: "Lookup is off in Customize.",
        risk: call.risk,
      })
    } else {
      runnable.push(call)
    }
  }
  const results: ToolResult[] = []
  for (const call of runnable) {
    results.push(await execute(call, input))
  }
  const retrieved =
    results.find((item) => item.name === "recall" && item.detail)?.detail
      ?.split("\n")
      .filter(Boolean) ?? []
  return { calls, results, pending, retrieved }
}

export function formatToolContext(run: SageRun): string {
  if (!run.results.length && !run.pending.length) return ""
  const lines: string[] = ["Tool results from Maya's body (treat as true for this turn):"]
  for (const result of run.results) {
    lines.push(`- ${result.name}: ${result.summary}`)
    if (result.detail) lines.push(result.detail.slice(0, 1600))
  }
  if (run.pending.length) {
    lines.push("Waiting for permission:")
    for (const item of run.pending) {
      lines.push(`- ${item.name}: ${item.reason}`)
    }
  }
  return lines.join("\n")
}

export function confirmCopy(pending: PendingConfirm[]): string {
  const item = pending[0]
  if (!item) return "I need your OK before I touch that."
  if (item.name === "python") {
    const code = (item.args.code || "").slice(0, 600)
    return `I can run this in my Python sandbox (data/workspace, 8 second cap). It does not control your desktop. Allow once, or turn on always-allow under Customize → Lookup.\n\n${code}`
  }
  if (item.name === "files_write") {
    return `I can write \`${item.args.path || "a file"}\` inside data/workspace — not anywhere else on your disk. Allow once?`
  }
  if (item.name === "google_gmail") {
    return `I can send this with the Google account you connected (not a service account). It goes to Gmail over Google's API. Allow once?\n\nTo: ${item.args.to || ""}\n${(item.args.subject || item.args.body || "").slice(0, 400)}`
  }
  if (item.name === "google_calendar") {
    return `I can create this on your Google Calendar via the API. Allow once, or turn on always-allow Google writes in Customize → Lookup.\n\n${item.args.title || item.args.query || ""}`
  }
  if (item.name === "google_tasks") {
    return `I can add this to Google Tasks. Allow once?\n\n${item.args.title || ""}`
  }
  return `${item.reason} Allow this once?`
}
