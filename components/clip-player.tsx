"use client"

import { useEffect, useRef, useState } from "react"
import { Pause, Volume2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STOP_EVENT = "maya-stop-clips"

export function stopClips(except?: HTMLAudioElement) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(STOP_EVENT, { detail: except }))
}

export function ClipPlayer({
  src,
  label,
}: {
  src: string
  label: string
}) {
  const innerRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const audio = innerRef.current
    if (!audio) return
    const onStop = (event: Event) => {
      const except = (event as CustomEvent<HTMLAudioElement | undefined>).detail
      if (except === audio) return
      audio.pause()
      audio.currentTime = 0
      setPlaying(false)
    }
    window.addEventListener(STOP_EVENT, onStop)
    return () => window.removeEventListener(STOP_EVENT, onStop)
  }, [src])

  async function toggle() {
    const audio = innerRef.current
    if (!audio) return
    if (!audio.paused && !audio.ended) {
      audio.pause()
      audio.currentTime = 0
      setPlaying(false)
      return
    }
    stopClips(audio)
    if (typeof window !== "undefined") window.speechSynthesis?.cancel()
    audio.muted = false
    audio.volume = 1
    try {
      await audio.play()
      setPlaying(true)
      setError(null)
    } catch {
      setPlaying(false)
      setError("Press play on the bar if the button is blocked.")
    }
  }

  return (
    <div className="flex min-w-[10rem] flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(playing && "border-primary")}
          onClick={() => void toggle()}
          aria-pressed={playing}
        >
          {playing ? <Pause /> : <Volume2 />}
          {playing ? "Playing" : label}
        </Button>
      </div>
      <div className="rounded-lg bg-neutral-100 p-1">
        <audio
          ref={innerRef}
          src={src}
          controls
          preload="auto"
          playsInline
          className="w-full"
          onPlay={() => {
            setPlaying(true)
            setError(null)
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() =>
            setError(
              "This browser could not play the clip. Try Customize → Voice."
            )
          }
        />
      </div>
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  )
}
