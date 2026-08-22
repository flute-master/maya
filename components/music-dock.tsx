"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Music2, Search } from "lucide-react"

import type { MusicTrack } from "@/lib/music"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

const STORE = "maya:now-playing"

export function loadNowPlaying(): MusicTrack | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORE)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MusicTrack
    if (!parsed?.url) return null
    return parsed
  } catch {
    return null
  }
}

export function saveNowPlaying(track: MusicTrack | null) {
  if (typeof window === "undefined") return
  if (!track) {
    localStorage.removeItem(STORE)
    return
  }
  localStorage.setItem(STORE, JSON.stringify(track))
}

export function MusicDock({
  open,
  onOpenChange,
  track,
  onTrack,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  track: MusicTrack | null
  onTrack: (track: MusicTrack) => void
}) {
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    if (track?.title) setDraft(track.title)
  }, [track?.title])

  async function search(query: string) {
    const q = query.trim()
    if (!q) return
    setBusy(true)
    setHint(null)
    try {
      const response = await fetch("/api/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      })
      const data = (await response.json()) as {
        error?: string
        track?: MusicTrack
      }
      if (!response.ok || !data.track) {
        throw new Error(data.error || "Could not find that song.")
      }
      onTrack(data.track)
      if (!data.track.videoId) {
        setHint("I dropped the YouTube search. Pick the video there.")
      }
    } catch (caught) {
      setHint(caught instanceof Error ? caught.message : "Music lookup failed.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md" showCloseButton>
        <SheetHeader className="border-b border-border">
          <SheetTitle>Music</SheetTitle>
          <SheetDescription>
            Free YouTube player. Say “play tum hi ho” in chat, or search here. Not
            Spotify — I cannot log into that.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void search(draft)
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Song or artist"
              aria-label="Song or artist"
            />
            <Button type="submit" disabled={busy || !draft.trim()}>
              <Search />
              {busy ? "Finding…" : "Find"}
            </Button>
          </form>
          {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
          {track?.embed ? (
            <div className="overflow-hidden rounded-xl bg-black ring-1 ring-foreground/10">
              <iframe
                title={track.title}
                src={track.embed}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl bg-muted/50 text-muted-foreground ring-1 ring-foreground/8">
              <Music2 className="size-8" />
              <p className="px-6 text-center text-sm">
                Search a song. I embed the YouTube video when I can pin one.
              </p>
            </div>
          )}
          {track ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">{track.title}</p>
              <a
                href={track.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
              >
                <ExternalLink className="size-3.5" />
                Open on YouTube
              </a>
              <p className="text-xs text-muted-foreground">
                Source: {track.source}. I do not download the audio.
              </p>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
