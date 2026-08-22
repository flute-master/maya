"use client"

import { useEffect, useRef } from "react"

import { MapPin, Music2, Square, Volume2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/lib/types"

export type FollowAlong = {
  messageId: string
  charIndex: number
}

function formatTime(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(ts)
}

export function ChatThread({
  messages,
  companionName,
  isThinking,
  ticks,
  error,
  onRetry,
  onSpeak,
  onStopSpeak,
  follow,
  onAllowTools,
  onPlayMusic,
}: {
  messages: ChatMessage[]
  companionName: string
  isThinking: boolean
  ticks?: string[]
  error: string | null
  onRetry: () => void
  onSpeak?: (text: string, messageId: string) => void
  onStopSpeak?: () => void
  follow?: FollowAlong | null
  onAllowTools?: (
    pending: NonNullable<ChatMessage["pending"]>
  ) => void
  onPlayMusic?: (track: {
    title: string
    url: string
    videoId?: string
    embed?: string
    source: string
  }) => void
}) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, isThinking, error])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
      {messages.map((message) => {
        const mine = message.role === "user"
        return (
          <article
            key={message.id}
            className={cn("flex flex-col gap-1.5", mine ? "items-end" : "items-start")}
          >
            <div
              className={cn(
                "max-w-[min(100%,38rem)] rounded-2xl px-4 py-3 text-[0.95rem] leading-7 whitespace-pre-wrap",
                mine
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card text-card-foreground ring-1 ring-foreground/8 rounded-bl-md"
              )}
            >
              {message.content ? (
                <FollowText
                  content={message.content}
                  charIndex={
                    follow?.messageId === message.id ? follow.charIndex : null
                  }
                />
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <span className="size-1.5 animate-pulse rounded-full bg-current" />
                  <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 px-1">
              <time className="text-[11px] tracking-wide text-muted-foreground/80">
                {mine ? "You" : companionName} · {formatTime(message.createdAt)}
              </time>
              {!mine && onSpeak && message.content ? (
                follow?.messageId === message.id ? (
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Stop speaking"
                    onClick={() => onStopSpeak?.()}
                  >
                    <Square />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Voice ${companionName}'s message`}
                    onClick={() => onSpeak(message.content, message.id)}
                  >
                    <Volume2 />
                  </Button>
                )
              ) : null}
            </div>
            {!mine && mapsLinkFrom(message.content) ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-1"
                onClick={() => {
                  const href = mapsLinkFrom(message.content)
                  if (href) window.open(href, "maya-maps", "noopener,noreferrer")
                }}
              >
                <MapPin />
                Open Google Maps
              </Button>
            ) : null}
            {!mine && youtubeFrom(message.content) && onPlayMusic ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-1"
                onClick={() => {
                  const found = youtubeFrom(message.content)
                  if (found) onPlayMusic(found)
                }}
              >
                <Music2 />
                Play in Maya
              </Button>
            ) : null}
            {!mine && message.tools?.length ? (
              <p className="max-w-[min(100%,38rem)] px-1 text-[11px] text-muted-foreground">
                Used {message.tools.map((tool) => tool.name).join(" · ")}
              </p>
            ) : null}
            {!mine && message.pending?.length && onAllowTools ? (
              <div className="flex max-w-[min(100%,38rem)] flex-wrap gap-2 px-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onAllowTools(message.pending ?? [])}
                >
                  Allow once
                </Button>
                <p className="self-center text-[11px] text-muted-foreground">
                  {message.pending.some((item) => item.name.startsWith("google_"))
                    ? "This uses the Google account you connected. She still cannot drive Chrome."
                    : "Python and file writes stay in data/workspace."}
                </p>
              </div>
            ) : null}
          </article>
        )
      })}

      {isThinking && messages.at(-1)?.role === "user" ? (
        <article className="flex flex-col items-start gap-1.5">
          <div className="rounded-2xl rounded-bl-md bg-card px-4 py-3 ring-1 ring-foreground/8">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
              <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
              <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
            </span>
          </div>
          <p className="px-1 text-[11px] text-muted-foreground/80">
            {companionName} is answering
          </p>
          {ticks?.length ? (
            <ul className="px-1 text-[11px] text-muted-foreground/80">
              {ticks.map((tick) => (
                <li key={tick}>◉ {tick}</li>
              ))}
            </ul>
          ) : null}
        </article>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 font-medium underline-offset-4 hover:underline"
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      ) : null}

      <div ref={endRef} />
    </div>
  )
}

const URL_SPLIT = /(https?:\/\/[^\s<>"']+)/g

function mapsLinkFrom(content: string) {
  const match = content.match(/https:\/\/(?:www\.)?google\.com\/maps\/[^\s<>"']+/i)
  return match?.[0]?.replace(/[),.;]+$/g, "") || null
}

function youtubeFrom(content: string) {
  const watch = content.match(
    /https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})[^\s<>"']*/i
  )
  if (!watch?.[1]) return null
  const id = watch[1]
  const title =
    content.match(/Playing:\s*([^\n]+)/i)?.[1]?.trim() || "YouTube"
  return {
    title,
    url: `https://www.youtube.com/watch?v=${id}`,
    videoId: id,
    embed: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
    source: "YouTube",
  }
}

function LinkedText({ content }: { content: string }) {
  const parts = content.split(URL_SPLIT)
  return (
    <>
      {parts.map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={`${part}-${index}`}
            href={part.replace(/[),.;]+$/g, "")}
            target="_blank"
            rel="noreferrer"
            className="break-all underline underline-offset-2"
          >
            {part}
          </a>
        ) : (
          <span key={`${index}-${part.slice(0, 12)}`}>{part}</span>
        )
      )}
    </>
  )
}

function FollowText({
  content,
  charIndex,
}: {
  content: string
  charIndex: number | null
}) {
  if (charIndex == null) return <LinkedText content={content} />
  const start = Math.max(0, Math.min(charIndex, content.length))
  let end = start
  while (end < content.length && !/\s/.test(content[end] ?? "")) end += 1
  return (
    <>
      <span className="text-foreground/55">{content.slice(0, start)}</span>
      <span className="rounded-sm bg-primary/25 text-foreground">
        {content.slice(start, end) || " "}
      </span>
      <span>{content.slice(end)}</span>
    </>
  )
}
