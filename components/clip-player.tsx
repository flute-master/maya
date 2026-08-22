"use client"

import { useEffect, useRef, useState } from "react"
import { Pause, Volume2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { armExclusiveAudio, stopAllAudio } from "@/lib/audio-bus"
import { cn } from "@/lib/utils"

export function stopClips(except?: HTMLAudioElement) {
  stopAllAudio(except)
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
    armExclusiveAudio()
  }, [])

  async function toggle() {
    const audio = innerRef.current
    if (!audio) return
    if (!audio.paused && !audio.ended) {
      audio.pause()
      audio.currentTime = 0
      setPlaying(false)
      return
    }
    stopAllAudio(audio)
    try {
      audio.muted = false
      audio.volume = 1
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
          preload="none"
          playsInline
          className="w-full"
          onPlay={(event) => {
            stopAllAudio(event.currentTarget)
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
