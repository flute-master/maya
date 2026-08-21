"use client"

import { useEffect, useRef } from "react"

import { Square, Volume2 } from "lucide-react"

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
  error,
  onRetry,
  onSpeak,
  onStopSpeak,
  follow,
}: {
  messages: ChatMessage[]
  companionName: string
  isThinking: boolean
  error: string | null
  onRetry: () => void
  onSpeak?: (text: string, messageId: string) => void
  onStopSpeak?: () => void
  follow?: FollowAlong | null
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
            {companionName} is finding the words
          </p>
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

function FollowText({
  content,
  charIndex,
}: {
  content: string
  charIndex: number | null
}) {
  if (charIndex == null) return <>{content}</>
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
