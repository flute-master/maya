"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { RotateCcw, SlidersHorizontal } from "lucide-react"

import { ChatThread, type FollowAlong } from "@/components/chat-thread"
import { Composer } from "@/components/composer"
import { EmptyState } from "@/components/empty-state"
import { PlannerDock } from "@/components/planner-dock"
import { SettingsSheet } from "@/components/settings-sheet"
import { VoiceDock } from "@/components/voice-dock"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DEFAULT_LEARNED, updateLearned } from "@/lib/adapt"
import { isSage } from "@/lib/bonds"
import { newId } from "@/lib/id"
import { describePresence } from "@/lib/personality"
import {
  buildMemoryContext,
  extractFacts,
  mergeFacts,
  upsertDigest,
} from "@/lib/recall"
import {
  isSpeakCommand,
  restoreSample,
  speakInto,
  speakLine,
  stopSpeaking,
} from "@/lib/speak"
import { hometownFromNotes } from "@/lib/skills"
import { readPublicIdentity } from "@/lib/identity"
import { intendedMeaning } from "@/lib/typos"
import { canRunOnDevice } from "@/lib/webgpu"
import {
  formatWhen,
  googleCalendarUrl,
  makeReminder,
  makeTask,
  parsePlan,
} from "@/lib/reminders"
import type { ChatMessage, Personality, Reminder } from "@/lib/types"
import {
  activeConversation,
  addNote,
  countStoredMessages,
  downloadVault,
  bootVault,
  loadVault,
  parseImport,
  patchReminder,
  patchTask,
  removeConversation,
  removeNote,
  saveVault,
  startFreshConversation,
  upsertReminder,
  upsertTask,
  withActiveMessages,
} from "@/lib/vault"
import { hydrateVault, writeDeviceMemory } from "@/lib/persist"

export function MayaApp() {
  const [vault, setVault] = useState(bootVault)
  const [bootReady, setBootReady] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [gpuOk, setGpuOk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<
    "offline" | "search" | "model" | "device" | "trained" | "sage"
  >(
    "offline"
  )
  const [online, setOnline] = useState(true)
  const [deviceHint, setDeviceHint] = useState<string | null>(null)
  const [modelReady, setModelReady] = useState(false)
  const [modelName, setModelName] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [follow, setFollow] = useState<FollowAlong | null>(null)
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null)
  const [deviceSave, setDeviceSave] = useState<"saving" | "saved" | "error">(
    "saved"
  )
  const abortRef = useRef<AbortController | null>(null)
  const retryRef = useRef<string | null>(null)
  const liveRef = useRef<HTMLAudioElement | null>(null)
  const hydratedRef = useRef(false)

  const personality = vault.personality
  const conversation = activeConversation(vault)
  const messages = conversation.messages
  const sage = isSage(personality)

  useEffect(() => {
    setGpuOk(canRunOnDevice())
    setVault(loadVault())
    setBootReady(true)
    let cancelled = false
    void hydrateVault().then((next) => {
      if (cancelled) return
      hydratedRef.current = true
      setVault(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js")
    }
    const sync = () => setOnline(navigator.onLine)
    sync()
    window.addEventListener("online", sync)
    window.addEventListener("offline", sync)
    return () => {
      window.removeEventListener("online", sync)
      window.removeEventListener("offline", sync)
    }
  }, [])

  useEffect(() => {
    if (!bootReady) return
    saveVault(vault)
    if (!hydratedRef.current) return
    setDeviceSave("saving")
    const timer = window.setTimeout(() => {
      void writeDeviceMemory(vault).then((ok) => {
        setDeviceSave(ok ? "saved" : "error")
      })
    }, 700)
    return () => window.clearTimeout(timer)
  }, [vault, bootReady])

  useEffect(() => {
    let cancelled = false
    fetch("/api/model")
      .then(async (response) => {
        const data = (await response.json()) as {
          available?: boolean
          using?: string | null
        }
        if (cancelled) return
        setModelReady(Boolean(data.available))
        setModelName(data.using ?? null)
      })
      .catch(() => {
        if (!cancelled) setModelReady(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => stopSpeaking()
  }, [])

  const haltVoice = useCallback(() => {
    stopSpeaking()
    const audio = liveRef.current
    if (audio) {
      audio.pause()
    }
    setFollow(null)
    setVoiceStatus(null)
  }, [])

  const playVoice = useCallback(
    async (text: string, messageId: string) => {
      const audio = liveRef.current
      stopSpeaking()
      setFollow({ messageId, charIndex: 0 })
      setVoiceStatus("Preparing her voice…")

      if (audio) {
        audio.muted = true
        try {
          await audio.play()
        } catch {
          /* unlock */
        }
        audio.pause()
        audio.muted = false
        audio.ontimeupdate = () => {
          if (!audio.duration || Number.isNaN(audio.duration)) return
          const charIndex = Math.min(
            text.length,
            Math.floor((audio.currentTime / audio.duration) * text.length)
          )
          setFollow({ messageId, charIndex })
        }
        audio.onended = () => {
          setFollow((current) =>
            current?.messageId === messageId ? null : current
          )
          restoreSample(audio)
          setVoiceStatus(null)
        }
        try {
          const result = await speakInto(audio, text, sage)
          if (result === "playing" || result === "ready") {
            setVoiceStatus(
              result === "ready"
                ? "Her line is loaded. Press play on Maya's voice."
                : "Speaking this reply. Press play if the bar stayed paused."
            )
            return
          }
        } catch {
          /* use the browser engine next */
        }
      }

      const started = speakLine(text, {
        voiceURI: vault.prefs.spokenVoiceURI,
        sage,
        onBoundary: (charIndex) => setFollow({ messageId, charIndex }),
        onEnd: () =>
          setFollow((current) =>
            current?.messageId === messageId ? null : current
          ),
      })
      if (started) {
        setVoiceStatus("Using this computer's speech engine.")
        return
      }
      setFollow(null)
      setVoiceStatus("Press play on Maya's voice. Live speech did not start.")
    },
    [sage, vault.prefs.spokenVoiceURI]
  )

  const fireReminder = useCallback(
    (item: Reminder) => {
      setVault((current) => patchReminder(current, item.id, { fired: true }))
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(
            `Maya · ${item.kind === "alarm" ? "Alarm" : "Reminder"}`,
            { body: item.text }
          )
        } catch {
          /* ignore */
        }
      }
      void playVoice(
        `${item.kind === "alarm" ? "Alarm" : "Reminder"}. ${item.text}`,
        item.id
      )
    },
    [playVoice]
  )

  useEffect(() => {
    const timers: number[] = []
    const now = Date.now()
    for (const item of vault.reminders ?? []) {
      if (item.done || item.fired) continue
      const wait = item.at - now
      if (wait <= 0) {
        if (now - item.at < 60 * 60_000) {
          timers.push(window.setTimeout(() => fireReminder(item), 400))
        }
        continue
      }
      if (wait > 2_147_000_000) continue
      timers.push(window.setTimeout(() => fireReminder(item), wait))
    }
    return () => {
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [vault.reminders, fireReminder])

  const setMessages = useCallback(
    (updater: ChatMessage[] | ((current: ChatMessage[]) => ChatMessage[])) => {
      setVault((current) => {
        const existing = activeConversation(current).messages
        const next = typeof updater === "function" ? updater(existing) : updater
        return withActiveMessages(current, next)
      })
    },
    []
  )

  const send = useCallback(
    async (
      text: string,
      retry: boolean | { retry?: boolean; approved?: Array<{ name: string; args?: Record<string, string> }> } = false
    ) => {
      const trimmed = text.trim()
      if (!trimmed) return

      if (isSpeakCommand(trimmed)) {
        const last = messages.filter(
          (message) => message.role === "assistant" && message.content
        ).at(-1)
        if (last) playVoice(last.content, last.id)
        return
      }

      haltVoice()

      abortRef.current?.abort()
      const abort = new AbortController()
      abortRef.current = abort
      retryRef.current = trimmed
      setError(null)

      const approved =
        typeof retry === "object" ? retry.approved : undefined
      const userMessage: ChatMessage = retry
        ? messages.filter((message) => message.role === "user").at(-1) ?? {
            id: newId(),
            role: "user",
            content: trimmed,
            createdAt: Date.now(),
          }
        : {
            id: newId(),
            role: "user",
            content: trimmed,
            createdAt: Date.now(),
          }
      const assistantMessage: ChatMessage = {
        id: newId(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      }

      const source =
        approved && messages.at(-1)?.role === "assistant"
          ? messages.slice(0, -1)
          : messages
      const nextMessages = retry ? source : [...messages, userMessage]
      const facts = retry ? [] : extractFacts(trimmed)
      const learned = retry
        ? vault.learned
        : updateLearned(vault.learned, trimmed)
      const plan = retry ? null : parsePlan(intendedMeaning(trimmed))
      if (plan) {
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "default" &&
          (plan.kind === "reminder" || plan.kind === "alarm")
        ) {
          void Notification.requestPermission()
        }

        let reply = ""
        let apply = (current: typeof vault) => current
        if (plan.kind === "need-time") {
          reply =
            "Tell me when — in 10 minutes, at 7pm, tomorrow at 9. I’ll hold it in this app and ping you here. I can’t set the Clock app on your phone without Google login."
        } else if (plan.kind === "reminder" || plan.kind === "alarm") {
          const item = makeReminder(plan)
          const cal = googleCalendarUrl(item.text, item.at)
          reply = `Set. ${item.kind === "alarm" ? "Alarm" : "Reminder"} for ${formatWhen(item.at)}: ${item.text}. I’ll speak it here if this tab is open. Optional — add it in Google Calendar:\n${cal}`
          apply = (current) => upsertReminder(current, item)
        } else if (plan.kind === "task") {
          const item = makeTask(plan.label)
          reply = `On the list: ${item.text}. Say “what’s on my list” anytime, or “mark ${item.text} done”.`
          apply = (current) => upsertTask(current, item)
        } else if (plan.kind === "task-done") {
          const match = (vault.tasks ?? []).find((item) =>
            item.text.toLowerCase().includes(plan.label.toLowerCase())
          )
          if (match) {
            reply = `Checked off: ${match.text}.`
            apply = (current) => patchTask(current, match.id, { done: true })
          } else {
            reply = `I don’t see “${plan.label}” on the list. Say “add a task: …” first.`
          }
        } else {
          const rems = (vault.reminders ?? []).filter((item) => !item.done)
          const todos = (vault.tasks ?? []).filter((item) => !item.done)
          const remLines = rems.length
            ? rems
                .map(
                  (item) =>
                    `• ${item.kind} · ${formatWhen(item.at)} · ${item.text}`
                )
                .join("\n")
            : "No open reminders."
          const taskLines = todos.length
            ? todos.map((item) => `• ${item.text}`).join("\n")
            : "No open tasks."
          reply = `Reminders\n${remLines}\n\nTasks\n${taskLines}`
        }

        const filled: ChatMessage[] = [
          ...nextMessages,
          { ...assistantMessage, content: reply },
        ]
        setVault((current) => {
          const withMsgs = withActiveMessages(apply(current), filled)
          return {
            ...withMsgs,
            notes: upsertDigest(mergeFacts(withMsgs.notes, facts), filled),
            learned,
          }
        })
        if (vault.prefs.speakReplies !== false) {
          playVoice(reply, assistantMessage.id)
        }
        return
      }

      const memory = buildMemoryContext(
        { ...vault, notes: mergeFacts(vault.notes, facts), learned },
        nextMessages
      )

      setVault((current) => {
        const withMessages = withActiveMessages(current, [
          ...nextMessages,
          assistantMessage,
        ])
        return {
          ...withMessages,
          notes: upsertDigest(mergeFacts(withMessages.notes, facts), [
            ...nextMessages,
            assistantMessage,
          ]),
          learned,
        }
      })
      setIsSending(true)

      const identity = readPublicIdentity(
        [
          ...vault.notes.map((note) => note.text),
          ...nextMessages
            .filter((message) => message.role === "user")
            .map((message) => message.content),
        ],
        personality.callMe
      )
      const keepLearned = (extra: unknown) => {
        if (!Array.isArray(extra)) return
        const lines = extra.filter(
          (line): line is string =>
            typeof line === "string" && line.trim().length > 4
        )
        if (!lines.length) return
        setVault((current) => ({
          ...current,
          notes: mergeFacts(current.notes, lines),
        }))
      }

      try {
        let acc = ""
        const useDevice =
          !online &&
          !modelReady &&
          vault.prefs.onDeviceModel !== false &&
          Boolean(deviceId)

        if (useDevice) {
          try {
            let hits: import("@/lib/types").SearchHit[] = []
            let searched = false
            if (vault.prefs.allowSearch && online) {
              const looked = await fetch("/api/lookup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: abort.signal,
                body: JSON.stringify({
                  text: trimmed,
                  hometown: hometownFromNotes(
                    vault.notes.map((note) => note.text)
                  ),
                  identity,
                }),
              })
              if (looked.ok) {
                const data = (await looked.json()) as {
                  hits?: import("@/lib/types").SearchHit[]
                  searched?: boolean
                  learn?: string[]
                }
                hits = data.hits ?? []
                searched = Boolean(data.searched && hits.length)
                keepLearned(data.learn)
              }
            }
            const { replyOnDevice } = await import("@/lib/on-device")
            const deviceText = await replyOnDevice({
              messages: nextMessages,
              personality,
              memory,
              hits,
              onToken: (text) => {
                acc = text
                setMessages((current) =>
                  current.map((message) =>
                    message.id === assistantMessage.id
                      ? { ...message, content: text }
                      : message
                  )
                )
              },
            })
            if (deviceText) {
              acc = deviceText
              setMode(searched ? "search" : "device")
            }
          } catch {
            acc = ""
          }
        }

        if (!acc) {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: abort.signal,
            body: JSON.stringify({
              messages: nextMessages.map((message) => ({
                role: message.role,
                content: message.content,
              })),
              personality,
              memory,
              learned,
              allowSearch: vault.prefs.allowSearch && online,
              useTrained: vault.prefs.useTrainedBrain !== false,
              allowPython: vault.prefs.allowPython === true,
              allowFileWrite: vault.prefs.allowFileWrite === true,
              approved,
            }),
          })

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as {
              error?: string
            } | null
            throw new Error(payload?.error || "Maya couldn't answer just then.")
          }

          const reported = response.headers.get("X-Maya-Mode")
          if (
            reported === "offline" ||
            reported === "search" ||
            reported === "model" ||
            reported === "trained" ||
            reported === "sage"
          ) {
            setMode(reported)
          }
          try {
            const packed = response.headers.get("X-Maya-Learn")
            if (packed) keepLearned(JSON.parse(packed) as unknown)
          } catch {
            /* ignore bad learn payload */
          }
          let tools: ChatMessage["tools"]
          let pending: ChatMessage["pending"]
          try {
            const packed = response.headers.get("X-Maya-Tools")
            if (packed) {
              tools = JSON.parse(packed) as ChatMessage["tools"]
            }
          } catch {
            /* ignore */
          }
          try {
            const packed = response.headers.get("X-Maya-Confirm")
            if (packed) {
              pending = JSON.parse(packed) as ChatMessage["pending"]
            }
          } catch {
            /* ignore */
          }

          const reader = response.body?.getReader()
          if (!reader) throw new Error("Maya's reply didn't come through.")
          const decoder = new TextDecoder()

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            acc += decoder.decode(value, { stream: true })
            const snapshot = acc
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessage.id
                  ? { ...message, content: snapshot, tools, pending }
                  : message
              )
            )
          }
        }

        if (vault.prefs.speakReplies !== false && acc.trim()) {
          playVoice(acc, assistantMessage.id)
        }
      } catch (caught) {
        setMessages((current) =>
          current.filter((message) => message.id !== assistantMessage.id)
        )
        if ((caught as Error).name === "AbortError") return
        setError(
          caught instanceof Error
            ? caught.message
            : "Something went sideways. Try again."
        )
      } finally {
        setIsSending(false)
      }
    },
    [messages, personality, playVoice, haltVoice, setMessages, vault, modelReady, online, deviceId]
  )

  const loadDevice = useCallback(async () => {
    setDeviceHint("Preparing the on-device model…")
    try {
      const { loadOnDeviceModel } = await import("@/lib/on-device")
      const id = await loadOnDeviceModel(setDeviceHint)
      setDeviceId(id)
      setDeviceHint(
        id
          ? `Ready on this device: ${id}`
          : "This browser has no WebGPU. Use Ollama on a computer, or Chrome/Edge on a recent phone."
      )
    } catch (caught) {
      setDeviceHint(
        caught instanceof Error
          ? caught.message
          : "Could not load the on-device model."
      )
    }
  }, [])

  async function attachFiles(files: File[]) {
    const saved: string[] = []
    try {
      for (const file of files.slice(0, 6)) {
        if (file.size > 2_000_000) {
          setError(`${file.name} is larger than 2 MB.`)
          continue
        }
        const base64 = await blobToBase64(file)
        const response = await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, base64 }),
        })
        const data = (await response.json()) as { error?: string; name?: string }
        if (!response.ok) {
          setError(data.error || `Could not save ${file.name}.`)
          continue
        }
        if (data.name) saved.push(data.name)
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not add that file to the workspace."
      )
      return
    }
    if (saved.length) {
      setError(null)
      void send(
        `I added ${saved.join(", ")} to your workspace. List your files and tell me what you have.`
      )
    }
  }

  async function shareScreen() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError(
        "This browser cannot capture a screen still. Use the paperclip to attach a screenshot instead."
      )
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })
      const track = stream.getVideoTracks()[0]
      if (!track) {
        setError("No screen track came through. Try the paperclip with a screenshot.")
        return
      }
      const video = document.createElement("video")
      video.srcObject = stream
      video.muted = true
      await video.play()
      await new Promise((resolve) => window.setTimeout(resolve, 250))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, video.videoWidth)
      canvas.height = Math.max(1, video.videoHeight)
      canvas.getContext("2d")?.drawImage(video, 0, 0)
      track.stop()
      stream.getTracks().forEach((item) => item.stop())
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      )
      if (!blob) {
        setError("Could not capture that frame.")
        return
      }
      const name = `screen-${Date.now()}.png`
      const base64 = await blobToBase64(blob)
      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, base64 }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(data?.error || "Could not save the still.")
      }
      setError(null)
      void send(
        `I shared a screen still as ${name}. Observe the workspace. I know you cannot see the pixels — tell me that honestly.`
      )
    } catch (caught) {
      const name = (caught as Error).name
      if (name === "NotAllowedError" || name === "NotFoundError") {
        setError(
          "Screen capture was blocked or cancelled. Allow it in the browser prompt, or attach a screenshot with the paperclip."
        )
        return
      }
      setError(
        caught instanceof Error ? caught.message : "Screen share failed."
      )
    }
  }

  function startOver() {
    abortRef.current?.abort()
    haltVoice()
    setVault((current) => startFreshConversation(current))
    setError(null)
    setIsSending(false)
  }

  async function importMemory(file: File) {
    const text = await file.text()
    const next = parseImport(text)
    setVault(next)
    setError(null)
  }

  const empty = messages.length === 0
  const returning =
    empty &&
    (vault.notes.length > 0 ||
      vault.conversations.some(
        (item) => item.id !== vault.activeId && item.messages.length > 0
      ))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border/80 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
            <h1 className="font-heading truncate text-lg font-medium tracking-tight">
              {personality.name}
            </h1>
            <Badge variant="outline" className="hidden sm:inline-flex">
              {!online
                ? "Offline"
                : mode === "sage"
                  ? "Sage core"
                  : mode === "search"
                    ? "Looked up"
                    : mode === "trained"
                      ? "Trained net"
                      : mode === "model"
                        ? "Local model"
                        : mode === "device"
                          ? "On-device"
                          : "On this machine"}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {describePresence(personality)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={startOver}
            disabled={empty && !error}
          >
            <RotateCcw />
            New
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          >
            <SlidersHorizontal />
            Customize
          </Button>
        </div>
      </header>

      {empty ? (
        <EmptyState
          name={personality.name}
          callMe={personality.callMe}
          returning={returning}
          modelReady={modelReady}
          modelName={modelName || deviceId}
          onLoadDevice={
            !modelReady && gpuOk ? () => void loadDevice() : undefined
          }
          past={vault.conversations
            .filter((item) => item.messages.length > 0)
            .slice(0, 4)
            .map((item) => ({ id: item.id, title: item.title }))}
          onOpenPast={(id) =>
            setVault((current) => ({ ...current, activeId: id }))
          }
          onStart={send}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ChatThread
            messages={messages}
            companionName={personality.name}
            isThinking={isSending && !messages.at(-1)?.content}
            error={error}
            follow={follow}
            onSpeak={playVoice}
            onStopSpeak={haltVoice}
            onRetry={() => {
              const last = retryRef.current
              if (last) void send(last, true)
            }}
            onAllowTools={(pending) => {
              const last = retryRef.current
              if (!last) return
              void send(last, {
                retry: true,
                approved: pending.map((item) => ({
                  name: item.name,
                  args: item.args,
                })),
              })
            }}
          />
        </div>
      )}

      {mode === "sage" && !empty ? (
        <p className="px-4 text-center text-xs text-muted-foreground">
          {personality.name} used tools on this machine — the body around the
          model.
        </p>
      ) : null}
      {mode === "search" && !empty ? (
        <p className="px-4 text-center text-xs text-muted-foreground">
          {personality.name} used the web for a fact — not for her voice.
        </p>
      ) : null}
      {mode === "trained" && !empty ? (
        <p className="px-4 text-center text-xs text-muted-foreground">
          {personality.name} answered with the transformer you trained from
          scratch on this machine.
        </p>
      ) : null}
      {mode === "model" && !empty ? (
        <p className="px-4 text-center text-xs text-muted-foreground">
          {personality.name} answered with the local Ollama model on this machine.
        </p>
      ) : null}

      <VoiceDock audioRef={liveRef} status={voiceStatus} />

      <PlannerDock
        reminders={vault.reminders ?? []}
        tasks={vault.tasks ?? []}
        onDismissReminder={(id) =>
          setVault((current) => patchReminder(current, id, { done: true }))
        }
        onToggleTask={(id) =>
          setVault((current) => {
            const item = current.tasks?.find((task) => task.id === id)
            if (!item) return current
            return patchTask(current, id, { done: !item.done })
          })
        }
      />

      <Composer
        name={personality.name}
        busy={isSending}
        error={empty ? error : null}
        onSend={send}
        onStop={() => {
          abortRef.current?.abort()
          setIsSending(false)
        }}
        speakReplies={vault.prefs.speakReplies !== false}
        speaking={Boolean(follow)}
        onStopSpeak={haltVoice}
        onSpeakRepliesChange={(speakReplies) => {
          if (!speakReplies) haltVoice()
          setVault((current) => ({
            ...current,
            prefs: { ...current.prefs, speakReplies },
          }))
        }}
        onAttach={(files) => void attachFiles(files)}
        onShareScreen={() => void shareScreen()}
      />

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        personality={personality}
        onPersonalityChange={(next: Personality) =>
          setVault((current) => ({ ...current, personality: next }))
        }
        prefs={vault.prefs}
        onPrefsChange={(prefs) =>
          setVault((current) => ({ ...current, prefs }))
        }
        learned={vault.learned}
        onResetLearned={() =>
          setVault((current) => ({ ...current, learned: { ...DEFAULT_LEARNED } }))
        }
        notes={vault.notes}
        conversations={vault.conversations}
        activeId={vault.activeId}
        storedCount={countStoredMessages(vault)}
        deviceSave={deviceSave}
        deviceHint={deviceHint}
        onLoadDevice={() => void loadDevice()}
        onExport={() => downloadVault(vault)}
        onImportFile={importMemory}
        onAddNote={(text) => setVault((current) => addNote(current, text))}
        onRemoveNote={(id) => setVault((current) => removeNote(current, id))}
        onOpenConversation={(id) =>
          setVault((current) => ({ ...current, activeId: id }))
        }
        onRemoveConversation={(id) =>
          setVault((current) => removeConversation(current, id))
        }
      />
    </div>
  )
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || "")
      const comma = result.indexOf(",")
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
