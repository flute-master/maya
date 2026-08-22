"use client"

import { useEffect, useRef, useState, type RefObject } from "react"

import { armExclusiveAudio, stopAllAudio } from "@/lib/audio-bus"
import { SAGE_SAMPLE } from "@/lib/speak"

export function VoiceDock({
  audioRef,
  status,
}: {
  audioRef: RefObject<HTMLAudioElement | null>
  status?: string | null
}) {
  const [clipMissing, setClipMissing] = useState(false)
  const recoverRef = useRef(false)

  useEffect(() => {
    armExclusiveAudio()
  }, [])

  async function recover(audio: HTMLAudioElement) {
    if (recoverRef.current) return
    recoverRef.current = true
    setClipMissing(true)
    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: SAGE_SAMPLE, sage: true }),
      })
      const type = response.headers.get("content-type") || ""
      if (!response.ok || !type.includes("audio")) return
      const blob = await response.blob()
      if (blob.size < 200) return
      audio.src = URL.createObjectURL(blob)
      setClipMissing(false)
    } catch {
      /* spoken replies still use the browser engine */
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-2">
      <div className="rounded-2xl bg-card px-3 py-2.5 text-foreground ring-1 ring-foreground/10">
        <p className="mb-1.5 text-xs font-medium tracking-wide">
          Maya&apos;s voice — press play
        </p>
        <audio
          ref={audioRef}
          controls
          preload="none"
          playsInline
          src="/clips/sage.mp3"
          className="w-full"
          onPlay={(event) => stopAllAudio(event.currentTarget)}
          onError={(event) => {
            void recover(event.currentTarget)
          }}
        />
        <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
          {status ||
            (clipMissing
              ? "Sample clip is missing on this machine. Spoken replies still use this browser’s voice."
              : "This bar is the spoken voice. Use it even during a chat. Not the anime character.")}{" "}
          {!clipMissing ? (
            <>
              <a
                href="/clips/sage.mp3"
                download="maya-sage.mp3"
                className="underline underline-offset-2"
              >
                Download
              </a>
              {" · "}
            </>
          ) : null}
          <a href="/hear.html" className="underline underline-offset-2">
            All clips
          </a>
        </p>
      </div>
    </div>
  )
}
