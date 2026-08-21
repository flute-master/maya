"use client"

import { stopAllAudio } from "@/lib/audio-bus"

type RecognitionResult = {
  transcript: string
  interim: string
}

export type ListenHandle = {
  stop: () => void
  abort: () => void
}

type SpeechRec = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
}

function recognitionEngine(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec
    webkitSpeechRecognition?: new () => SpeechRec
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function canListen() {
  if (typeof window === "undefined") return false
  return Boolean(
    recognitionEngine() || navigator.mediaDevices?.getUserMedia
  )
}

function errorMessage(code: string) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission was denied. Allow it for this site, then tap the mic again."
    case "audio-capture":
      return "No microphone was found, or another app is using it."
    case "network":
      return "Chrome’s speech recognizer needs the network. You can still type."
    case "language-not-supported":
      return "This browser rejected the speech language."
    default:
      return "Listening failed. You can still type."
  }
}

export function startListening(handlers: {
  onUpdate: (result: RecognitionResult) => void
  onEnd: () => void
  onError: (message: string, fatal?: boolean) => void
  onLevel?: (level: number) => void
  lang?: string
}): ListenHandle | null {
  if (typeof window === "undefined") {
    handlers.onError("Listening only works in the browser.")
    return null
  }
  if (!window.isSecureContext) {
    handlers.onError(
      "Microphone needs localhost or HTTPS. Open http://127.0.0.1:43217 in Chrome or Edge."
    )
    return null
  }

  stopAllAudio()

  const Engine = recognitionEngine()
  let stopped = false
  let rec: SpeechRec | null = null
  let stream: MediaStream | null = null
  let audioCtx: AudioContext | null = null
  let levelRaf = 0
  let restartTimer = 0
  let startFails = 0
  const lang = handlers.lang || "en-IN"

  function clearTimers() {
    if (levelRaf) cancelAnimationFrame(levelRaf)
    levelRaf = 0
    if (restartTimer) window.clearTimeout(restartTimer)
    restartTimer = 0
  }

  function teardown() {
    clearTimers()
    handlers.onLevel?.(0)
    try {
      rec?.abort()
    } catch {
      /* already stopped */
    }
    rec = null
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
    void audioCtx?.close().catch(() => undefined)
    audioCtx = null
  }

  function finish(message?: string) {
    if (stopped) return
    stopped = true
    teardown()
    if (message) handlers.onError(message, true)
    handlers.onEnd()
  }

  function pumpLevel(analyser: AnalyserNode) {
    const data = new Uint8Array(analyser.fftSize)
    const tick = () => {
      if (stopped) return
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (const sample of data) {
        const n = (sample - 128) / 128
        sum += n * n
      }
      handlers.onLevel?.(Math.min(1, Math.sqrt(sum / data.length) * 4))
      levelRaf = requestAnimationFrame(tick)
    }
    levelRaf = requestAnimationFrame(tick)
  }

  function armMic() {
    if (!navigator.mediaDevices?.getUserMedia) {
      if (!Engine) {
        finish("This browser cannot open a microphone. Use Chrome or Edge, or type.")
      }
      return
    }
    void navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((got) => {
        if (stopped) {
          got.getTracks().forEach((track) => track.stop())
          return
        }
        stream = got
        try {
          const Ctx =
            window.AudioContext ||
            (window as Window & { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext
          if (!Ctx) return
          audioCtx = new Ctx()
          const source = audioCtx.createMediaStreamSource(got)
          const analyser = audioCtx.createAnalyser()
          analyser.fftSize = 512
          source.connect(analyser)
          void audioCtx.resume()
          pumpLevel(analyser)
        } catch {
          /* level meter is optional */
        }
      })
      .catch((caught: unknown) => {
        if (stopped) return
        const name = caught instanceof DOMException ? caught.name : ""
        if (name === "NotAllowedError" || name === "SecurityError") {
          finish(
            "Microphone permission was denied. Allow it for this site, then tap the mic again."
          )
          return
        }
        if (name === "NotFoundError") {
          finish("No microphone was found.")
          return
        }
        if (!Engine) {
          finish("Could not open the microphone. You can still type.")
        }
      })
  }

  function beginRec(nextLang = lang) {
    if (stopped || !Engine) return
    const next = new Engine()
    next.continuous = true
    next.interimResults = true
    next.lang = nextLang
    next.onresult = (event) => {
      startFails = 0
      let finalText = ""
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += piece
        else interim += piece
      }
      handlers.onUpdate({ transcript: finalText, interim })
    }
    next.onerror = (event) => {
      if (stopped) return
      if (event.error === "no-speech" || event.error === "aborted") return
      if (event.error === "language-not-supported" && nextLang !== "en-US") {
        try {
          next.abort()
        } catch {
          /* ignore */
        }
        beginRec("en-US")
        return
      }
      finish(errorMessage(event.error))
    }
    next.onend = () => {
      rec = null
      if (stopped) {
        handlers.onEnd()
        return
      }
      // Chrome stops after a pause. Keep the session open until the user taps stop.
      restartTimer = window.setTimeout(() => {
        if (!stopped) beginRec(nextLang)
      }, 160)
    }
    try {
      next.start()
      rec = next
      startFails = 0
    } catch (caught) {
      startFails += 1
      if (startFails >= 6) {
        finish(
          caught instanceof Error
            ? caught.message
            : "Could not start the microphone."
        )
        return
      }
      restartTimer = window.setTimeout(() => {
        if (!stopped) beginRec(nextLang)
      }, 280)
    }
  }

  armMic()
  if (Engine) {
    beginRec()
  } else {
    handlers.onError(
      "Mic is open, but this browser cannot turn speech into text. Use Chrome or Edge, or type.",
      false
    )
  }

  return {
    stop() {
      finish()
    },
    abort() {
      if (stopped) return
      stopped = true
      teardown()
    },
  }
}
