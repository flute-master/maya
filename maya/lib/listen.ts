"use client"

type RecognitionResult = {
  transcript: string
  interim: string
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

function RecognitionEngine(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec
    webkitSpeechRecognition?: new () => SpeechRec
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function canListen() {
  return Boolean(RecognitionEngine())
}

export function startListening(handlers: {
  onUpdate: (result: RecognitionResult) => void
  onEnd: () => void
  onError: (message: string) => void
  lang?: string
}) {
  const Engine = RecognitionEngine()
  if (!Engine) {
    handlers.onError("This browser cannot listen. Type instead.")
    return null
  }
  const rec = new Engine()
  rec.continuous = true
  rec.interimResults = true
  rec.lang = handlers.lang || "en-IN"
  rec.onresult = (event) => {
    let finalText = ""
    let interim = ""
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i][0].transcript
      if (event.results[i].isFinal) finalText += piece
      else interim += piece
    }
    handlers.onUpdate({ transcript: finalText, interim })
  }
  rec.onerror = (event) => {
    if (event.error === "aborted" || event.error === "no-speech") return
    handlers.onError(
      event.error === "not-allowed"
        ? "Microphone permission was denied."
        : "Listening failed. You can still type."
    )
  }
  rec.onend = () => handlers.onEnd()
  rec.start()
  return rec
}
