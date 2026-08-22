"use client"

import { useEffect, useState } from "react"

import { ClipPlayer, stopClips } from "@/components/clip-player"
import { Button } from "@/components/ui/button"
import { indianWomanVoices, stopSpeaking } from "@/lib/speak"
import type { Personality, Prefs } from "@/lib/types"
import { MAYA_VOICES, type MayaVoice } from "@/lib/voices"

export function VoicePicker({
  personality,
  prefs,
  onPick,
  onSpokenVoice,
  sage = false,
}: {
  personality: Personality
  prefs: Prefs
  onPick: (voice: MayaVoice) => void
  onSpokenVoice: (uri: string) => void
  sage?: boolean
}) {
  const [spoken, setSpoken] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    function refresh() {
      setSpoken(indianWomanVoices())
    }
    refresh()
    if (typeof window === "undefined") return
    window.speechSynthesis?.addEventListener("voiceschanged", refresh)
    return () => {
      window.speechSynthesis?.removeEventListener("voiceschanged", refresh)
      stopSpeaking()
      stopClips()
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium">Maya&apos;s voice</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Original Indian women — not the anime character, not a celebrity.
          Spoken replies use this computer&apos;s voice by default. Press Hear
          to audition a recorded register.
        </p>
      </div>

      {sage ? (
        <ClipPlayer
          src="/clips/sage.mp3"
          label="Hear the inner-sage register"
        />
      ) : null}

      <div className="flex flex-col gap-3">
        {MAYA_VOICES.map((voice) => {
          const selected = personality.voiceId === voice.id
          return (
            <article
              key={voice.id}
              className={`rounded-xl p-3 text-left ring-1 ${
                selected
                  ? "bg-primary/15 ring-primary/40"
                  : "bg-card ring-foreground/8"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {voice.name}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {voice.place}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {voice.promise}
                  </p>
                </div>
                {selected ? (
                  <span className="shrink-0 text-[11px] font-medium text-primary">
                    Using
                  </span>
                ) : null}
              </div>
              <p className="font-heading mt-2 text-sm leading-6 text-foreground/90">
                “{voice.sample}”
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ClipPlayer src={`/clips/${voice.id}.mp3`} label="Hear this" />
                <Button
                  type="button"
                  size="sm"
                  variant={selected ? "secondary" : "default"}
                  onClick={() => onPick(voice)}
                >
                  {selected ? "Selected" : "Use this voice"}
                </Button>
              </div>
            </article>
          )
        })}
      </div>

      {spoken.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Spoken instrument</p>
          <p className="text-xs text-muted-foreground">
            Indian women voices your computer actually has. Live replies use
            this. The Hear buttons play recorded clips so you can listen even
            if this browser has no Indian voice.
          </p>
          <select
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
            value={prefs.spokenVoiceURI}
            onChange={(event) => onSpokenVoice(event.target.value)}
          >
            <option value="">Auto (prefer Indian English)</option>
            {spoken.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Live spoken replies use whatever voice this computer has. The Hear
          clips still play — they are recorded Indian English, not this
          browser&apos;s synth.
        </p>
      )}
    </div>
  )
}
