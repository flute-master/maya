"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp, Mic, Monitor, Paperclip, Square } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { canListen, startListening, type ListenHandle } from "@/lib/listen"
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
  const [level, setLevel] = useState(0)
  const recRef = useRef<ListenHandle | null>(null)
  const committedRef = useRef("")
  const boxRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const onSendRef = useRef(onSend)
  onSendRef.current = onSend

  function readBox() {
    return (boxRef.current?.value ?? value).trim()
  }

  function submit() {
    const text = readBox()
    if (!text) return
    stopMic()
    onSendRef.current(text)
    setValue("")
    committedRef.current = ""
    if (boxRef.current) boxRef.current.value = ""
  }

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return
      event.preventDefault()
      submit()
    }
    box.addEventListener("keydown", onKey)
    return () => {
      box.removeEventListener("keydown", onKey)
      recRef.current?.abort()
    }
  }, [])

  function stopMic() {
    recRef.current?.stop()
    recRef.current = null
    setListening(false)
    setLevel(0)
  }

  function toggleMic() {
    if (listening) {
      stopMic()
      return
    }
    if (!canListen()) {
      setListenHint(
        "This browser cannot listen. Use Chrome or Edge, or type instead."
      )
      return
    }
    onStopSpeak()
    setListenHint(null)
    committedRef.current = readBox() ? `${readBox()} ` : ""
    try {
      const rec = startListening({
        onUpdate: ({ transcript, interim }) => {
          if (transcript) committedRef.current += `${transcript} `
          const next = `${committedRef.current}${interim}`.replace(/\s+/g, " ")
          setValue(next)
          if (boxRef.current) boxRef.current.value = next
        },
        onEnd: () => {
          recRef.current = null
          setListening(false)
          setLevel(0)
        },
        onError: (message, fatal = true) => {
          setListenHint(message)
          if (fatal) {
            recRef.current = null
            setListening(false)
            setLevel(0)
          }
        },
        onLevel: setLevel,
      })
      recRef.current = rec
      setListening(Boolean(rec))
      if (!rec) {
        setListenHint(
          (current) =>
            current ||
            "Could not start the microphone. Allow it for this site, or type."
        )
      }
    } catch (caught) {
      setListening(false)
      setListenHint(
        caught instanceof Error
          ? caught.message
          : "Could not start the microphone."
      )
    }
  }

  const helper = listening
    ? "Listening — speak, then tap the square or Send."
    : "Enter sends. Shift+Enter makes a new line."
  const banner = error || listenHint

  return (
    <form
      className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-1 bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {banner ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {banner}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs text-muted-foreground">{helper}</p>
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
          aria-pressed={listening}
          className={cn(
            "relative overflow-hidden rounded-full",
            listening && "ring-2 ring-primary/70"
          )}
          onClick={toggleMic}
        >
          {listening ? (
            <span
              aria-hidden
              className="absolute inset-1 rounded-full bg-primary-foreground/25"
              style={{ transform: `scale(${0.45 + level * 0.7})` }}
            />
          ) : null}
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
        <textarea
          ref={boxRef}
          rows={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={listening ? "Listening…" : `Message ${name}…`}
          aria-label={`Message ${name}`}
          className="max-h-36 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-card px-4 py-2.5 text-base shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {busy ? (
          <button
            type="button"
            aria-label="Stop"
            className={cn(
              buttonVariants({ variant: "secondary", size: "icon-lg" }),
              "rounded-full"
            )}
            onClick={onStop}
          >
            <Square />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Send"
            className={cn(
              buttonVariants({ size: "icon-lg" }),
              "rounded-full"
            )}
            onClick={submit}
          >
            <ArrowUp />
          </button>
        )}
      </div>
    </form>
  )
}
