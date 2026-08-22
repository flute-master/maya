import { join } from "node:path"

import { listWorkspace, safeFileName, WORKSPACE } from "@/lib/sage/files"
import { describeKinds } from "@/lib/flute/kinds"
import { formatLesson, lessonFor } from "@/lib/flute/lessons"
import { hearClip } from "@/lib/flute/hear"
import { extractSongQuery, findTune, formatTune, unknownSong } from "@/lib/flute/songbook"

const AUDIO = /\.(wav|mp3|m4a|aac|ogg|webm|flac)$/i

export function isFluteQuery(text: string) {
  const lower = text.toLowerCase()
  return (
    /\b(teach me (to play |the )?(flute|bansuri)|i want to learn (the )?(flute|bansuri)|flute lesson|kinds of flute|notes for|sargam for|how to (play|hold|start) (the )?(flute|bansuri)|riyaz)\b/.test(
      lower
    ) ||
    /\b(flute|bansuri).{0,24}\b(teach|lesson|notes|beginner|kinds?|types?|sargam|fingering)\b/.test(
      lower
    ) ||
    /\b(teach|lesson|notes|kinds?|sargam).{0,24}\b(flute|bansuri)\b/.test(lower)
  )
}

function wantsKinds(text: string) {
  return /\b(kinds?|types?|which flute|bansuri vs|concert flute|piccolo|shakuhachi|dizi|difference)\b/i.test(
    text
  )
}

function wantsLesson(text: string) {
  return /\b(teach|lesson|beginner|how do i (start|hold|blow|breathe)|riyaz|practice|embouchure|first note)\b/i.test(
    text
  )
}

function wantsHear(text: string) {
  return /\b(clip|recording|this (audio|file|take)|hear this|notes in (this|the) (clip|file|audio)|transcribe|what notes)\b/i.test(
    text
  )
}

function wantsSong(text: string) {
  return (
    Boolean(findTune(text)) ||
    /\b(notes for|sargam (for|of)|how to play|flute notes)\b/i.test(text)
  )
}

async function latestAudio(named?: string) {
  const rows = await listWorkspace()
  const audio = rows.filter((row) => AUDIO.test(row.name))
  if (named) {
    const want = safeFileName(named)
    return audio.find((row) => row.name === want) || audio.at(-1)
  }
  return audio.at(-1)
}

export async function runFluteTool(
  args: Record<string, string>
): Promise<{ ok: boolean; summary: string; detail?: string }> {
  const action = (args.action || "auto").toLowerCase()
  const query = args.query || args.text || ""

  if (action === "kinds" || (action === "auto" && wantsKinds(query))) {
    const hit = describeKinds(query)
    return { ok: true, ...hit }
  }

  if (action === "hear" || (action === "auto" && wantsHear(query))) {
    const file = await latestAudio(args.path)
    if (!file) {
      return {
        ok: false,
        summary: "No audio clip in the workspace yet.",
        detail:
          "Paperclip a short WAV/MP3/M4A of the phrase (under 8 MB), then say “notes for this clip”.",
      }
    }
    return hearClip(join(WORKSPACE, file.name))
  }

  if (action === "song" || (action === "auto" && wantsSong(query))) {
    const name = extractSongQuery(query) || query
    const tune = findTune(query) || findTune(name)
    if (tune) return { ok: true, ...formatTune(tune) }
    if (name.length > 1) return { ok: true, ...unknownSong(name) }
  }

  if (action === "lesson" || action === "teach" || action === "auto") {
    return { ok: true, ...formatLesson(lessonFor(query)) }
  }

  return { ok: true, ...formatLesson(lessonFor("start")) }
}
