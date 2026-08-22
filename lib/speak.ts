"use client"

import { setSpeechStop, stopAllAudio } from "@/lib/audio-bus"
import { forSpokenText, spokenChunks } from "@/lib/spoken-text"

export type VoiceHints = {
  langHints?: string[]
  nameHints?: string[]
}

export type SpeakOptions = VoiceHints & {
  voiceURI?: string
  sage?: boolean
  onBoundary?: (charIndex: number) => void
  onEnd?: () => void
}

function allVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return []
  return window.speechSynthesis.getVoices()
}

function normalizeLang(value: string) {
  return value.toLowerCase().replace(/_/g, "-")
}

export function isLikelyIndianVoice(voice: SpeechSynthesisVoice) {
  const lang = normalizeLang(voice.lang)
  const name = voice.name.toLowerCase()
  return (
    lang.startsWith("en-in") ||
    lang.startsWith("hi") ||
    name.includes("india") ||
    name.includes("hindi") ||
    name.includes("heera") ||
    name.includes("veena") ||
    name.includes("shruti")
  )
}

function isLikelyMale(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase()
  return (
    name.includes("male") ||
    name.includes("ravi") ||
    name.includes("hemant") ||
    name.includes("prabhat") ||
    name.includes("david") ||
    name.includes("daniel") ||
    name.includes("alex") ||
    name.includes("fred") ||
    name.includes("tom")
  )
}

export function indianWomanVoices(): SpeechSynthesisVoice[] {
  return allVoices()
    .filter((voice) => isLikelyIndianVoice(voice) && !isLikelyMale(voice))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function listSpokenVoices() {
  const groups = new Map<string, SpeechSynthesisVoice[]>()
  for (const voice of allVoices()) {
    const key = voice.lang || "other"
    const list = groups.get(key) ?? []
    list.push(voice)
    groups.set(key, list)
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([lang, voices]) => ({
      lang,
      voices: voices.sort((a, b) => a.name.localeCompare(b.name)),
    }))
}

function scoreVoice(
  voice: SpeechSynthesisVoice,
  langHints: string[],
  nameNeedles: string[]
) {
  let score = 0
  const lang = normalizeLang(voice.lang)
  const name = voice.name.toLowerCase()

  for (const hint of langHints) {
    const wanted = normalizeLang(hint)
    if (lang === wanted) score += 14
    else if (lang.startsWith(`${wanted}-`)) score += 12
    else if (wanted.includes("-") && lang.startsWith(wanted.split("-")[0] ?? "")) {
      const region = wanted.split("-")[1]
      if (region && lang.includes(`-${region}`)) score += 11
      else score += 4
    } else if (lang.startsWith(wanted.slice(0, 2))) score += 3
  }

  if (nameNeedles.some((needle) => name.includes(needle.toLowerCase()))) {
    score += 8
  }
  if (isLikelyMale(voice)) score -= 5
  if (voice.localService) score += 1
  if (voice.default) score += 1
  return score
}

export function pickSpokenVoice(preferredURI?: string, hints?: VoiceHints) {
  const voices = allVoices()
  if (preferredURI) {
    const match = voices.find((voice) => voice.voiceURI === preferredURI)
    if (match) return match
  }

  const langHints = hints?.langHints ?? []
  const nameNeedles = hints?.nameHints ?? []
  if (langHints.length || nameNeedles.length) {
    let best: SpeechSynthesisVoice | null = null
    let bestScore = 0
    for (const voice of voices) {
      const score = scoreVoice(voice, langHints, nameNeedles)
      if (score > bestScore) {
        bestScore = score
        best = voice
      }
    }
    if (best) return best
  }

  const indian = indianWomanVoices()
  const heera = indian.find((voice) => /heera|veena|shruti/i.test(voice.name))
  const english = voices.filter((voice) =>
    normalizeLang(voice.lang).startsWith("en")
  )
  return heera || indian[0] || english[0] || voices[0] || null
}

export function canSpeak() {
  return typeof window !== "undefined" && Boolean(window.speechSynthesis)
}

let speakGeneration = 0

setSpeechStop(() => {
  speakGeneration += 1
  if (typeof window !== "undefined") window.speechSynthesis?.cancel()
})

export function unlockSpeech() {
  if (typeof window === "undefined") return
  try {
    window.speechSynthesis?.resume()
  } catch {
    /* ignore */
  }
}

export function speakLine(text: string, options: SpeakOptions | string = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return false
  const opts = typeof options === "string" ? { voiceURI: options } : options
  const chunks = spokenChunks(text)
  if (!chunks.length) return false

  stopAllAudio()
  try {
    window.speechSynthesis.resume()
    window.speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
  const generation = ++speakGeneration
  const voice = pickSpokenVoice(opts.voiceURI, {
    langHints: opts.langHints,
    nameHints: opts.nameHints,
  })
  const rate = opts.sage ? 0.98 : 1.04
  const pitch = opts.sage ? 1.0 : 1.03
  let index = 0
  let spokenChars = 0

  const speakNext = () => {
    if (generation !== speakGeneration) return
    if (index >= chunks.length) {
      opts.onEnd?.()
      return
    }
    const chunk = chunks[index] ?? ""
    const utterance = new SpeechSynthesisUtterance(chunk)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    } else {
      utterance.lang = opts.langHints?.[0] ?? "en-IN"
    }
    utterance.rate = rate
    utterance.pitch = pitch
    const startAt = spokenChars
    utterance.onboundary = (event) => {
      if (generation !== speakGeneration) return
      if (typeof event.charIndex === "number") {
        opts.onBoundary?.(startAt + event.charIndex)
      }
    }
    utterance.onend = () => {
      if (generation !== speakGeneration) return
      spokenChars += chunk.length + 1
      index += 1
      window.setTimeout(speakNext, opts.sage ? 110 : 70)
    }
    utterance.onerror = () => {
      if (generation !== speakGeneration) return
      opts.onEnd?.()
    }
    window.speechSynthesis.speak(utterance)
    opts.onBoundary?.(startAt)
  }

  speakNext()
  return allVoices().length > 0
}

export function stopSpeaking() {
  if (typeof window === "undefined") return
  stopAllAudio()
}

let spokenObjectUrl = ""

export async function speakInto(
  audio: HTMLAudioElement,
  text: string,
  sage: boolean
): Promise<"playing" | "ready" | false> {
  const response = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: forSpokenText(text), sage }),
  })
  const type = response.headers.get("content-type") || ""
  if (!response.ok || !type.includes("audio")) return false
  const blob = await response.blob()
  if (blob.size < 200) return false
  if (spokenObjectUrl) URL.revokeObjectURL(spokenObjectUrl)
  spokenObjectUrl = URL.createObjectURL(blob)
  audio.src = spokenObjectUrl
  audio.muted = false
  audio.volume = 1
  stopAllAudio(audio)
  try {
    await audio.play()
    return "playing"
  } catch {
    return "ready"
  }
}

export function restoreSample(audio: HTMLAudioElement) {
  audio.src = "/clips/sage.mp3"
}

export function isSpeakCommand(text: string) {
  return /^(please\s+)?(speak|voice|read|say)(\s+(that|this|it|the last(\s+(message|reply))?))?(\s+(aloud|out loud|to me))?[.!?]?$/i.test(
    text.trim()
  )
}

export const SAGE_SAMPLE =
  "I am here, Master. Analysis first, then a proposal. I do not leave the post. Say the problem when you are ready."
