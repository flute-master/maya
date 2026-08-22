"use client"

import type { ComponentType } from "react"
import {
  BookOpen,
  Brain,
  Calculator,
  CalendarDays,
  CloudSun,
  Flame,
  Newspaper,
  Scale,
  ScrollText,
  Sparkles,
  Terminal,
  Tv,
} from "lucide-react"

import {
  GoogleCalendarMark,
  GoogleMapsMark,
  YouTubeMark,
} from "@/components/brand-marks"
import { MayaMark } from "@/components/maya-mark"
import { RoomPicker } from "@/components/room-picker"
import { Button } from "@/components/ui/button"
import type { AtmosphereId } from "@/lib/atmosphere"

const STARTERS: Array<{
  label: string
  text: string
  icon: ComponentType<{ className?: string }>
}> = [
  { label: "Remember", text: "What do you remember about me?", icon: Brain },
  { label: "Analyze", text: "Analyze whether I should buy this laptop.", icon: Scale },
  { label: "Plan", text: "Plan my weekend.", icon: CalendarDays },
  { label: "Story", text: "Write me a short story about a night bus in Hyderabad.", icon: ScrollText },
  { label: "Weather", text: "What's the weather in Hyderabad right now?", icon: CloudSun },
  { label: "News", text: "What's the news? Local if you know my city, plus national and world.", icon: Newspaper },
  { label: "Manga", text: "Where can I read Frieren and watch the anime legally?", icon: BookOpen },
  { label: "Mihon", text: "Tachiyomi or Mihon — how do I read manga on my phone?", icon: Tv },
  { label: "Python", text: "Run python: print(sum(range(10)))", icon: Terminal },
  { label: "Calendar", text: "What's on my Google Calendar today?", icon: GoogleCalendarMark },
  { label: "Skills", text: "What can you actually do on this machine?", icon: Sparkles },
  { label: "Flute", text: "Teach me flute. I am a beginner.", icon: Flame },
  { label: "Maps", text: "Take me to Charminar", icon: GoogleMapsMark },
  { label: "Calc", text: "Calculate 15% of 240", icon: Calculator },
  { label: "Music", text: "Play tum hi ho on YouTube", icon: YouTubeMark },
]

export function EmptyState({
  name,
  callMe,
  returning,
  past,
  onOpenPast,
  onStart,
  modelReady,
  modelName,
  onLoadDevice,
  atmosphere,
  onAtmosphere,
}: {
  name: string
  callMe: string
  returning: boolean
  past: Array<{ id: string; title: string }>
  onOpenPast: (id: string) => void
  onStart: (text: string) => void
  modelReady?: boolean
  modelName?: string | null
  onLoadDevice?: () => void
  atmosphere: AtmosphereId
  onAtmosphere: (id: AtmosphereId) => void
}) {
  const who = callMe.trim()

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12 text-center">
      <div className="relative mb-8">
        <div className="pointer-events-none absolute inset-0 -m-10 rounded-full bg-primary/20 blur-3xl" />
        <div
          className="relative flex size-20 items-center justify-center rounded-full bg-card text-primary ring-1 ring-foreground/10"
          title={name}
        >
          <MayaMark className="size-12" />
        </div>
      </div>
      <h1 className="font-heading text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
        {name}
      </h1>
      <div className="mt-5 flex w-full flex-col items-center gap-2">
        <RoomPicker compact value={atmosphere} onPick={onAtmosphere} />
      </div>
      <p className="mt-4 max-w-sm text-base leading-7 text-muted-foreground">
        {returning
          ? `You're back${who ? `, ${who}` : ""}. I still have us — pick up wherever.`
          : "Inner sage. Always with you. Tools on this machine. I do not take over your desktop."}
      </p>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        {modelReady
          ? `Local model live${modelName ? `: ${modelName}` : ""}.`
          : "She answers now. Load a local brain later if you want."}
      </p>
      {onLoadDevice ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="mt-3"
          onClick={onLoadDevice}
          title="Load on-device brain"
          aria-label="Load on-device brain"
        >
          <Brain />
        </Button>
      ) : null}
      {past.length > 0 ? (
        <div className="mt-6 flex w-full flex-col gap-2">
          {past.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              className="h-auto justify-start truncate rounded-xl px-3 py-2 text-left"
              onClick={() => onOpenPast(item.id)}
            >
              {item.title}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="mt-8 grid w-full grid-cols-3 gap-2 sm:grid-cols-5">
        {STARTERS.map((starter) => {
          const Icon = starter.icon
          return (
            <button
              key={starter.label}
              type="button"
              title={starter.label}
              aria-label={starter.label}
              onClick={() => onStart(starter.text)}
              className="flex items-center justify-center rounded-2xl border border-border bg-card px-2 py-3.5 text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
            >
              <Icon className="size-6 text-primary" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
