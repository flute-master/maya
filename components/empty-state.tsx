"use client"

import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SAGE_SAMPLE } from "@/lib/speak"

const STARTERS = [
  {
    label: "Tell me a story",
    text: "Write me a short story about a night bus in Hyderabad.",
  },
  {
    label: "Weather",
    text: "What's the weather in Hyderabad right now?",
  },
  {
    label: "Run Python",
    text: "Run python: print(sum(range(10)))",
  },
  {
    label: "Calendar",
    text: "What's on my Google Calendar today?",
  },
  {
    label: "What can you do",
    text: "What can you actually do on this machine?",
  },
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
}) {
  const who = callMe.trim()

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 -m-10 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex size-16 items-center justify-center rounded-full bg-card ring-1 ring-foreground/10">
          <Sparkles className="size-6 text-primary" />
        </div>
      </div>
      <h1 className="font-heading text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
        {name}
      </h1>
      <p className="mt-4 max-w-sm text-base leading-7 text-muted-foreground">
        {returning
          ? `You're back${who ? `, ${who}` : ""}. I still have us — pick up wherever.`
          : "Inner sage. Always with you. I think, I stay, I use tools on this machine — lookup, files, Python you allow, reminders. I do not take over your desktop. A local model answers when one is running."}
      </p>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        {modelReady
          ? `Local model live${modelName ? `: ${modelName}` : ""}. World facts still get a lookup when the network is on.`
          : "No computer model yet. Load the free on-device brain (Chrome/Edge, ~0.9 GB once) or install Ollama. She still answers either way."}
      </p>
      {onLoadDevice ? (
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={onLoadDevice}
        >
          Load on-device brain
        </Button>
      ) : null}
      <p className="font-heading mt-6 max-w-sm text-sm leading-6 text-foreground/90">
        “{SAGE_SAMPLE}”
      </p>
      <p className="mt-2 max-w-sm text-xs text-muted-foreground">
        Press play on Maya&apos;s voice below to hear her. Inner sage, Indian
        English — not the anime character.
      </p>
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
              Continue: {item.title}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
        {STARTERS.map((starter) => (
          <Button
            key={starter.label}
            type="button"
            variant="outline"
            className="h-auto rounded-full px-4 py-2.5 text-left whitespace-normal"
            onClick={() => onStart(starter.text)}
          >
            {starter.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
