"use client"

let armed = false
let speechStop = () => {
  if (typeof window !== "undefined") window.speechSynthesis?.cancel()
}

function isMedia(node: EventTarget | null): node is HTMLMediaElement {
  return Boolean(node && node instanceof HTMLMediaElement)
}

export function setSpeechStop(hook: () => void) {
  speechStop = hook
}

export function stopAllAudio(except?: HTMLMediaElement) {
  if (typeof window === "undefined") return
  speechStop()
  for (const node of document.querySelectorAll("audio, video")) {
    if (!(node instanceof HTMLMediaElement) || node === except) continue
    node.pause()
    try {
      node.currentTime = 0
    } catch {
      /* ignore unready media */
    }
  }
}

function onPlayCapture(event: Event) {
  if (!isMedia(event.target)) return
  stopAllAudio(event.target)
}

export function armExclusiveAudio() {
  if (typeof document === "undefined" || armed) return
  armed = true
  document.addEventListener("play", onPlayCapture, true)
}

if (typeof document !== "undefined") armExclusiveAudio()
