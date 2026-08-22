"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { ArrowUp, Mic, Monitor, Paperclip, Square, Volume2, VolumeOff } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { canListen, startListening, type ListenHandle } from "@/lib/listen"
import { cn } from "@/lib/utils"

function isEnterKey(event: {
  key?: string
  code?: string
  keyCode?: number
  which?: number
}) {
  const key = event.key
  const code = event.code
  const keyCode = event.keyCode ?? event.which
  return (
    key === "Enter" ||
    key === "NumpadEnter" ||
    key === "\n" ||
    code === "Enter" ||
    code === "NumpadEnter" ||
    keyCode === 13
  )
}

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
  const [listening, setListening] = useState(false)
  const [listenHint, setListenHint] = useState<string | null>(null)
  const [level, setLevel] = useState(0)
  const [filled, setFilled] = useState(false)
  const recRef = useRef<ListenHandle | null>(null)
  const committedRef = useRef("")
  const boxRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const onSendRef = useRef(onSend)
  const busyRef = useRef(busy)
  const shiftHeld = useRef(false)
  onSendRef.current = onSend
  busyRef.current = busy

  function readBox() {
    return (boxRef.current?.value ?? "").trim()
  }

  function markFilled() {
    setFilled(Boolean(boxRef.current?.value.trim()))
  }

  function clearBox() {
    committedRef.current = ""
    if (boxRef.current) boxRef.current.value = ""
    setFilled(false)
  }

  const flushSend = () => {
    const text = readBox()
    if (!text) return false
    stopMic()
    onSendRef.current(text)
    clearBox()
    return true
  }

  useEffect(() => {
    const box = boxRef.current
    if (!box) return

    function onKey(event: KeyboardEvent) {
      if (event.target !== box && event.target !== boxRef.current) return
      if (event.key === "Shift") shiftHeld.current = true
      if (event.isComposing || event.keyCode === 229) return
      if (!isEnterKey(event) || event.shiftKey) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (busyRef.current) return
      flushSend()
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.key === "Shift") shiftHeld.current = false
    }

    function onBefore(event: InputEvent) {
      if (event.inputType !== "insertLineBreak" && event.inputType !== "insertParagraph") {
        return
      }
      if (shiftHeld.current) return
      event.preventDefault()
      if (busyRef.current) return
      flushSend()
    }

    box.addEventListener("keydown", onKey, true)
    box.addEventListener("keyup", onKeyUp, true)
    box.addEventListener("beforeinput", onBefore, true)
    return () => {
      box.removeEventListener("keydown", onKey, true)
      box.removeEventListener("keyup", onKeyUp, true)
      box.removeEventListener("beforeinput", onBefore, true)
      recRef.current?.abort()
    }
  }, [])

  function onBoxKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Shift") shiftHeld.current = true
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    if (!isEnterKey(event) || event.shiftKey) return
    event.preventDefault()
    event.stopPropagation()
    if (busyRef.current) return
    flushSend()
  }

  function onBoxKeyUp(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Shift") shiftHeld.current = false
  }

  function onBoxBeforeInput(event: FormEvent<HTMLTextAreaElement>) {
    const inputType = (event.nativeEvent as InputEvent).inputType
    if (inputType !== "insertLineBreak" && inputType !== "insertParagraph") {
      return
    }
    if (shiftHeld.current) return
    event.preventDefault()
    if (busyRef.current) return
    flushSend()
  }

  useEffect(() => {
    return () => {
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
          if (boxRef.current) boxRef.current.value = next
          setFilled(Boolean(next.trim()))
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
      ref={formRef}
      className="relative z-20 mx-auto flex w-full max-w-2xl flex-col gap-1 bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (busyRef.current) return
        flushSend()
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
              size="icon-xs"
              variant="ghost"
              onClick={onStopSpeak}
              aria-label="Stop voice"
              title="Stop voice"
            >
              <Square />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon-xs"
            variant={speakReplies ? "secondary" : "ghost"}
            aria-pressed={speakReplies}
            aria-label={speakReplies ? "Spoken replies on" : "Text only"}
            title={speakReplies ? "Spoken replies on" : "Text only"}
            onClick={() => onSpeakRepliesChange(!speakReplies)}
          >
            {speakReplies ? <Volume2 /> : <VolumeOff />}
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <textarea
          ref={boxRef}
          name="message"
          rows={1}
          defaultValue=""
          onInput={markFilled}
          onKeyDown={onBoxKeyDown}
          onKeyUp={onBoxKeyUp}
          onBlur={() => {
            shiftHeld.current = false
          }}
          onBeforeInput={onBoxBeforeInput}
          enterKeyHint="send"
          placeholder={listening ? "Listening…" : `Message ${name}…`}
          aria-label={`Message ${name}`}
          className="max-h-36 min-h-11 w-full min-w-0 resize-none rounded-2xl border border-input bg-card px-4 py-2.5 text-base shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <div className="flex flex-wrap items-center gap-2">
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
              "relative cursor-pointer overflow-hidden rounded-full"
            )}
            title="Attach a file Maya can read or hear"
            aria-label="Add files to Maya's workspace"
          >
            <Paperclip className="pointer-events-none" />
            <input
              type="file"
              hidden
              className="pointer-events-none"
              tabIndex={-1}
              multiple
              accept=".txt,.md,.csv,.json,.py,.ts,.js,.html,.css,.log,.png,.jpg,.jpeg,.webp,.gif,.wav,.mp3,.m4a,.ogg,audio/*,image/*"
              onChange={(event) => {
                const list = event.target.files
                event.target.value = ""
                if (!list?.length) return
                onAttach(Array.from(list))
              }}
            />
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
        {busy ? (
          <button
            type="button"
            aria-label="Stop"
            className={cn(
              buttonVariants({ variant: "secondary", size: "icon-lg" }),
              "ml-auto rounded-full"
            )}
            onClick={onStop}
          >
            <Square />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Send"
            disabled={!filled}
            className={cn(
              buttonVariants({ size: "icon-lg" }),
              "ml-auto rounded-full"
            )}
          >
            <ArrowUp />
          </button>
        )}
        </div>
      </div>
    </form>
  )
}
