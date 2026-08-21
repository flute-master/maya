"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp, Mic, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { canListen, startListening } from "@/lib/listen"

export function Composer({
  name,
  disabled,
  onSend,
  speakReplies,
  onSpeakRepliesChange,
  speaking,
  onStopSpeak,
}: {
  name: string
  disabled: boolean
  onSend: (text: string) => void
  speakReplies: boolean
  onSpeakRepliesChange: (next: boolean) => void
  speaking: boolean
  onStopSpeak: () => void
}) {
  const [value, setValue] = useState("")
  const [listening, setListening] = useState(false)
  const [listenHint, setListenHint] = useState<string | null>(null)
  const recRef = useRef<ReturnType<typeof startListening>>(null)
  const committedRef = useRef("")

  useEffect(() => {
    return () => recRef.current?.abort()
  }, [])

  function submit() {
    const text = value.trim()
    if (!text || disabled) return
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

  return (
    <form
      className="mx-auto flex w-full max-w-2xl flex-col gap-1 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        {listenHint ? (
          <p className="text-xs text-muted-foreground">{listenHint}</p>
        ) : listening ? (
          <p className="text-xs text-muted-foreground">
            Listening — words appear as text. Send when you are ready.
          </p>
        ) : speakReplies ? (
          <p className="text-xs text-muted-foreground">
            Talk mode: she speaks replies; the transcript still leads and
            follows along.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Text first. Mic is optional. She stays silent unless you ask.
          </p>
        )}
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
            {speakReplies ? "Spoken replies on" : "Spoken replies off"}
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
        <Textarea
          value={value}
          disabled={disabled}
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
        <Button
          type="submit"
          size="icon-lg"
          disabled={disabled || !value.trim()}
          aria-label="Send"
          className="rounded-full"
        >
          <ArrowUp />
        </Button>
      </div>
    </form>
  )
}
