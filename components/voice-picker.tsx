"use client"

import { useEffect, useState } from "react"

import { ClipPlayer, stopClips } from "@/components/clip-player"
import { Button } from "@/components/ui/button"
import { listSpokenVoices, speakLine, stopSpeaking } from "@/lib/speak"
import type { Personality, Prefs } from "@/lib/types"
import {
  MAYA_VOICES,
  RECORDED_VOICE_IDS,
  VOICE_REGIONS,
  type MayaVoice,
} from "@/lib/voices"

function SpeakPreview({ voice }: { voice: MayaVoice }) {
  const [playing, setPlaying] = useState(false)

  function toggle() {
    if (playing) {
      stopSpeaking()
      setPlaying(false)
      return
    }
    stopClips()
    const started = speakLine(voice.sample, {
      langHints: voice.langHints,
      nameHints: voice.nameHints,
      onEnd: () => setPlaying(false),
    })
    setPlaying(Boolean(started))
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-pressed={playing}
      onClick={toggle}
    >
      {playing ? "Stop" : "Hear this"}
    </Button>
  )
}

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
  const [spoken, setSpoken] = useState<
    ReturnType<typeof listSpokenVoices>
  >([])

  useEffect(() => {
    function refresh() {
      setSpoken(listSpokenVoices())
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

  const spokenCount = spoken.reduce((sum, group) => sum + group.voices.length, 0)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium">Maya&apos;s voice</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a writing voice and an accent — North India, Britain, Europe,
          the US, Australia, and a few further Englishes. Original personas,
          not celebrities, not an anime character. Recorded Hear clips are
          Indian English. Other accents use this computer&apos;s closest
          speech-engine match.
        </p>
      </div>

      {sage ? (
        <ClipPlayer
          src="/clips/sage.mp3"
          label="Hear the inner-sage register"
        />
      ) : null}

      <div className="flex flex-col gap-6">
        {VOICE_REGIONS.map((region) => {
          const voices = MAYA_VOICES.filter((voice) => voice.region === region.id)
          if (!voices.length) return null
          return (
            <section key={region.id} className="flex flex-col gap-2">
              <div>
                <p className="text-sm font-medium">{region.label}</p>
                <p className="text-xs text-muted-foreground">{region.blurb}</p>
              </div>
              <div className="flex flex-col gap-3">
                {voices.map((voice) => {
                  const selected = personality.voiceId === voice.id
                  const recorded = RECORDED_VOICE_IDS.has(voice.id)
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
                        {recorded ? (
                          <ClipPlayer
                            src={`/clips/${voice.id}.mp3`}
                            label="Hear this"
                          />
                        ) : (
                          <SpeakPreview voice={voice} />
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant={selected ? "secondary" : "default"}
                          onClick={() => {
                            stopSpeaking()
                            onSpokenVoice("")
                            onPick(voice)
                          }}
                        >
                          {selected ? "Selected" : "Use this voice"}
                        </Button>
                      </div>
                      {!recorded ? (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Hear uses this computer&apos;s closest {voice.place}{" "}
                          match. No recorded clip for this accent.
                        </p>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {spokenCount > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Spoken instrument</p>
          <p className="text-xs text-muted-foreground">
            Every voice this computer actually has. Leave Auto on and Maya
            picks from the accent you chose above. Override here if you want
            a specific engine voice.
          </p>
          <select
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
            value={prefs.spokenVoiceURI}
            onChange={(event) => onSpokenVoice(event.target.value)}
          >
            <option value="">Auto (match her accent)</option>
            {spoken.map((group) => (
              <optgroup key={group.lang} label={group.lang}>
                {group.voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          This browser has not listed speech voices yet. Recorded Hear clips
          still play. Live replies will use whatever engine appears after
          voices load.
        </p>
      )}
    </div>
  )
}
