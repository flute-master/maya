"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp, Mic, Monitor, Paperclip, Square } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { canListen, startListening } from "@/lib/listen"
import { cn } from "@/lib/utils"

export function Composer({
  name,
  busy,
  error,
  onSend,
  onStop,
  speakReplies,
  onSpeakRepliesChange,
  speaking,
  onStopSpeak,
  onAttach,
  onShareScreen,
}: {
  name: string
  busy: boolean
  error?: string | null
  onSend: (text: string) => void
  onStop?: () => void
  speakReplies: boolean
  onSpeakRepliesChange: (next: boolean) => void
  speaking: boolean
  onStopSpeak: () => void
  onAttach?: (files: File[]) => void
  onShareScreen?: () => void
}) {
  const [value, setValue] = useState("")
  const [listening, setListening] = useState(false)
  const [listenHint, setListenHint] = useState<string | null>(null)
  const recRef = useRef<ReturnType<typeof startListening>>(null)
  const committedRef = useRef("")
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => recRef.current?.abort()
  }, [])

  function submit() {
    const text = value.trim()
    if (!text || busy) return
    stopMic()
    onSend(text)
    setValue("")
    committedRef.current = ""
  }

  function stopMic() {
    recRef.current?.stop()
    recRef.current = null
    setListening(false)
  }

  function toggleMic() {
    if (listening) {
      stopMic()
      return
    }
    if (!canListen()) {
      setListenHint("This browser cannot listen. Type instead.")
      return
    }
    setListenHint(null)
    committedRef.current = value.trim() ? `${value.trim()} ` : ""
    const rec = startListening({
      onUpdate: ({ transcript, interim }) => {
        if (transcript) committedRef.current += `${transcript} `
        setValue(`${committedRef.current}${interim}`.replace(/\s+/g, " "))
      },
      onEnd: () => setListening(false),
      onError: (message) => {
        setListenHint(message)
        setListening(false)
      },
    })
    recRef.current = rec
    setListening(Boolean(rec))
  }

  const hint = listenHint
    ? listenHint
    : listening
      ? "Listening — words appear as text. Send when you are ready."
      : speakReplies
        ? "She speaks each reply. Paperclip adds files. Monitor saves a screen still."
        : "Text only. Paperclip adds files. Monitor saves a screen still."

  return (
    <form
      className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-1 bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs text-muted-foreground">{hint}</p>
        <div className="ml-auto flex items-center gap-2">
          {speaking ? (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={onStopSpeak}
            >
              <Square />
              Stop voice
            </Button>
          ) : null}
          <Button
            type="button"
            size="xs"
            variant={speakReplies ? "secondary" : "ghost"}
            aria-pressed={speakReplies}
            onClick={() => onSpeakRepliesChange(!speakReplies)}
          >
            {speakReplies ? "Spoken replies on" : "Text only"}
          </Button>
        </div>
      </div>
      <div className="flex items-end gap-2">
        <Button
          type="button"
          size="icon-lg"
          variant={listening ? "default" : "outline"}
          aria-label={listening ? "Stop listening" : "Speak to Maya"}
          className="rounded-full"
          onClick={toggleMic}
        >
          {listening ? <Square /> : <Mic />}
        </Button>
        {onAttach ? (
          <label
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-lg" }),
              "cursor-pointer rounded-full"
            )}
          >
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              multiple
              onChange={(event) => {
                const list = event.target.files
                event.target.value = ""
                if (!list?.length) return
                onAttach(Array.from(list))
              }}
            />
            <Paperclip />
            <span className="sr-only">Add files to Maya&apos;s workspace</span>
          </label>
        ) : null}
        {onShareScreen ? (
          <Button
            type="button"
            size="icon-lg"
            variant="outline"
            aria-label="Share a screen still"
            className="rounded-full"
            onClick={onShareScreen}
          >
            <Monitor />
          </Button>
        ) : null}
        <Textarea
          value={value}
          rows={1}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          placeholder={`Message ${name}…`}
          aria-label={`Message ${name}`}
          className="max-h-36 min-h-11 flex-1 resize-none rounded-2xl bg-card px-4 py-2.5 shadow-sm"
        />
        {busy ? (
          <Button
            type="button"
            size="icon-lg"
            variant="secondary"
            aria-label="Stop"
            className="rounded-full"
            onClick={onStop}
          >
            <Square />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon-lg"
            disabled={!value.trim()}
            aria-label="Send"
            className="rounded-full"
            onClick={submit}
          >
            <ArrowUp />
          </Button>
        )}
      </div>
    </form>
  )
}
