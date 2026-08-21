"use client"

import { setSpeechStop, stopAllAudio } from "@/lib/audio-bus"
import { forSpokenText, spokenChunks } from "@/lib/spoken-text"

export type SpeakOptions = {
  voiceURI?: string
  sage?: boolean
  onBoundary?: (charIndex: number) => void
  onEnd?: () => void
}

function allVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return []
  return window.speechSynthesis.getVoices()
}

export function isLikelyIndianVoice(voice: SpeechSynthesisVoice) {
  const lang = voice.lang.toLowerCase()
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
    name.includes("prabhat")
  )
}

export function indianWomanVoices(): SpeechSynthesisVoice[] {
  return allVoices()
    .filter((voice) => isLikelyIndianVoice(voice) && !isLikelyMale(voice))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function pickSpokenVoice(preferredURI?: string) {
  const voices = allVoices()
  if (preferredURI) {
    const match = voices.find((voice) => voice.voiceURI === preferredURI)
    if (match) return match
  }
  const indian = indianWomanVoices()
  const heera = indian.find((voice) => /heera|veena|shruti/i.test(voice.name))
  return heera || indian[0] || null
}

export function canSpeak() {
  return typeof window !== "undefined" && Boolean(window.speechSynthesis)
}

let speakGeneration = 0

setSpeechStop(() => {
  speakGeneration += 1
  if (typeof window !== "undefined") window.speechSynthesis?.cancel()
})

export function speakLine(text: string, options: SpeakOptions | string = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return false
  const opts = typeof options === "string" ? { voiceURI: options } : options
  const chunks = spokenChunks(text)
  if (!chunks.length) return false

  stopAllAudio()
  const generation = ++speakGeneration
  const voice = pickSpokenVoice(opts.voiceURI)
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
      utterance.lang = "en-IN"
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
