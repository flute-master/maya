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
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className={cn(playing && "border-primary")}
        onClick={() => void toggle()}
        aria-pressed={playing}
        aria-label={playing ? "Stop clip" : label}
        title={playing ? "Stop clip" : label}
      >
        {playing ? <Pause /> : <Volume2 />}
      </Button>
      <audio
        ref={innerRef}
        src={src}
        preload="none"
        playsInline
        className="hidden"
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
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  )
}
