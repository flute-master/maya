"use client"

import { useEffect, type RefObject } from "react"

import { armExclusiveAudio, stopAllAudio } from "@/lib/audio-bus"

export function VoiceDock({
  audioRef,
  status,
}: {
  audioRef: RefObject<HTMLAudioElement | null>
  status?: string | null
}) {
  useEffect(() => {
    armExclusiveAudio()
  }, [])

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-2">
      <div className="rounded-2xl bg-neutral-100 px-3 py-2.5 text-neutral-900 ring-1 ring-black/10">
        <p className="mb-1.5 text-xs font-medium tracking-wide">
          Maya&apos;s voice — press play
        </p>
        <audio
          ref={audioRef}
          controls
          preload="auto"
          playsInline
          src="/clips/sage.mp3"
          className="w-full"
          onPlay={(event) => stopAllAudio(event.currentTarget)}
        />
        <p className="mt-1.5 text-[11px] leading-4 text-neutral-600">
          {status ||
            "This bar is the spoken voice. Use it even during a chat. Not the anime character."}{" "}
          <a
            href="/clips/sage.mp3"
            download="maya-sage.mp3"
            className="underline underline-offset-2"
          >
            Download
          </a>
          {" · "}
          <a href="/hear.html" className="underline underline-offset-2">
            All clips
          </a>
        </p>
      </div>
    </div>
  )
}
