import { newId } from "@/lib/id"
import type { Reminder, TaskItem } from "@/lib/types"

const UNIT_MS: Record<string, number> = {
  second: 1000,
  seconds: 1000,
  sec: 1000,
  secs: 1000,
  minute: 60_000,
  minutes: 60_000,
  min: 60_000,
  mins: 60_000,
  hour: 3_600_000,
  hours: 3_600_000,
  hr: 3_600_000,
  hrs: 3_600_000,
  day: 86_400_000,
  days: 86_400_000,
}

function clockAt(
  hours: number,
  minutes: number,
  mer: string | undefined,
  tomorrow: boolean,
  now: Date
) {
  const merLow = (mer || "").toLowerCase()
  const stamp = (h: number) => {
    const when = new Date(now)
    when.setSeconds(0, 0)
    when.setHours(h, minutes, 0, 0)
    return when
  }
  let h = hours
  if (merLow === "pm" && h < 12) h += 12
  if (merLow === "am" && h === 12) h = 0
  const when = stamp(h)
  if (tomorrow) {
    when.setDate(when.getDate() + 1)
    return when.getTime()
  }
  if (when.getTime() > now.getTime() + 20_000) return when.getTime()
  if (!merLow && hours > 0 && hours < 12) {
    const later = stamp(hours + 12)
    if (later.getTime() > now.getTime() + 20_000) return later.getTime()
  }
  when.setDate(when.getDate() + 1)
  return when.getTime()
}

function tidyLabel(raw: string | undefined, fallback: string) {
  const cleaned = (raw || "")
    .replace(/^(to|that|about)\s+/i, "")
    .replace(/[?.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned || fallback
}

export function formatWhen(at: number) {
  return new Date(at).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function googleCalendarUrl(label: string, at: number) {
  const start = new Date(at)
  const end = new Date(at + 15 * 60_000)
  const stamp = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`
  }
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(label)}&dates=${stamp(start)}/${stamp(end)}`
}

export type ParsedPlan =
  | {
      kind: "reminder" | "alarm"
      at: number
      label: string
    }
  | { kind: "need-time" }
  | { kind: "task"; label: string }
  | { kind: "task-list" }
  | { kind: "task-done"; label: string }
  | { kind: "planner-list" }

export function parsePlan(text: string, now = Date.now()): ParsedPlan | null {
  const t = text.trim()
  const lower = t.toLowerCase()

  if (
    /\b(what('?s| is) on my (list|tasks?)|my (tasks?|to-?dos?|reminders)|show (my )?(tasks?|reminders|alarms))\b/.test(
      lower
    )
  ) {
    return { kind: "planner-list" }
  }

  const done = t.match(
    /^(?:mark|tick|check off)\s+(.+?)\s+done\.?$/i
  ) || t.match(/^done:\s*(.+)$/i)
  if (done?.[1]) return { kind: "task-done", label: tidyLabel(done[1], "") }

  const task = t.match(
    /^(?:add (?:a )?task|task|todo|to-do|add to (?:my )?(?:list|tasks?))\s*[:\-]\s*(.+)$/i
  ) || t.match(/^add (?:a )?task\s+(.+)$/i)
  if (task?.[1]) return { kind: "task", label: tidyLabel(task[1], "Task") }

  const wantsAlarm = /\b(set an? alarm|wake me|alarm for|alarm at)\b/.test(lower)
  const wantsRemind =
    wantsAlarm ||
    /\b(remind me|set a reminder|set reminder)\b/.test(lower)
  if (!wantsRemind) return null

  const kind: "reminder" | "alarm" = wantsAlarm ? "alarm" : "reminder"
  const fallback = kind === "alarm" ? "Alarm" : "Reminder"
  const tomorrow = /\btomorrow\b/.test(lower)
  const morning = /\b(tomorrow morning|in the morning|this morning)\b/.test(lower)

  if (morning && !/\bat\s+\d/.test(lower)) {
    const label = tidyLabel(
      t
        .replace(
          /^(remind me|set a reminder|set reminder|set an? alarm|wake me)\s+/i,
          ""
        )
        .replace(/\b(tomorrow morning|in the morning|this morning)\b/i, "")
        .replace(/^(to|that|about)\s+/i, ""),
      fallback
    )
    return {
      kind,
      at: clockAt(9, 0, "am", tomorrow || /\btomorrow morning\b/.test(lower), new Date(now)),
      label,
    }
  }

  const rel = t.match(
    /\bin\s+(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|hr|days?)\b(?:\s+(?:to|that)\s+(.+))?/i
  )
  if (rel) {
    const n = Number(rel[1])
    const unit = rel[2].toLowerCase()
    const ms = UNIT_MS[unit]
    if (ms && n > 0) {
      const before = t
        .slice(0, rel.index)
        .replace(/^(remind me|set a reminder|set reminder|set an? alarm|wake me)\s+(to\s+)?/i, "")
        .trim()
      const label = tidyLabel(rel[3] || before, fallback)
      return { kind, at: now + n * ms, label }
    }
  }

  const abs = t.match(
    /\b(?:at|for)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b(?:\s+(?:to|that)\s+(.+))?/i
  )
  if (abs) {
    const hours = Number(abs[1])
    const minutes = abs[2] ? Number(abs[2]) : 0
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const label = tidyLabel(abs[4], fallback)
      return {
        kind,
        at: clockAt(hours, minutes, abs[3], tomorrow, new Date(now)),
        label,
      }
    }
  }

  return { kind: "need-time" }
}

export function makeReminder(
  parsed: Extract<ParsedPlan, { kind: "reminder" | "alarm" }>
): Reminder {
  return {
    id: newId(),
    kind: parsed.kind,
    text: parsed.label,
    at: parsed.at,
    done: false,
    fired: false,
    createdAt: Date.now(),
  }
}

export function makeTask(label: string): TaskItem {
  return {
    id: newId(),
    text: label,
    done: false,
    createdAt: Date.now(),
  }
}
