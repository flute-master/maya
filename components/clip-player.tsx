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
  quote,
  featured = false,
}: {
  src: string
  label: string
  quote?: string
  featured?: boolean
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
    } catch (caught) {
      setPlaying(false)
      setError(
        caught instanceof Error
          ? "Press the play bar below if the button is blocked."
          : "Could not start audio."
      )
    }
  }

  const player = (
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
        setError("This browser could not play the clip. Try the download link.")
      }
    />
  )

  if (featured) {
    return (
      <div className="mx-auto w-full max-w-sm rounded-2xl bg-neutral-100 px-4 py-3 text-left text-neutral-900 ring-1 ring-black/10">
        <p className="font-heading text-sm leading-6">“{quote}”</p>
        <Button
          type="button"
          className="mt-3 w-full rounded-full"
          variant={playing ? "secondary" : "default"}
          onClick={() => void toggle()}
          aria-pressed={playing}
        >
          {playing ? <Pause /> : <Volume2 />}
          {playing ? "Playing — tap to stop" : label}
        </Button>
        <div className="mt-3">{player}</div>
        {error ? (
          <p className="mt-2 text-xs text-red-700">{error}</p>
        ) : (
          <p className="mt-2 text-[11px] leading-4 text-neutral-600">
            Press play on the bar if you hear nothing. Inner sage, Indian
            English — not the anime voice.{" "}
            <a href={src} download className="underline underline-offset-2">
              Download clip
            </a>
          </p>
        )}
      </div>
    )
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
      <div className="rounded-lg bg-neutral-100 p-1">{player}</div>
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  )
}
