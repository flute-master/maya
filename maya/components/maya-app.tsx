"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Download, RotateCcw, SlidersHorizontal } from "lucide-react"

import { ChatThread, type FollowAlong } from "@/components/chat-thread"
import { Composer } from "@/components/composer"
import { EmptyState } from "@/components/empty-state"
import { SettingsSheet } from "@/components/settings-sheet"
import { VoiceDock } from "@/components/voice-dock"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DEFAULT_LEARNED, updateLearned } from "@/lib/adapt"
import { isSage } from "@/lib/bonds"
import { newId } from "@/lib/id"
import { describePresence } from "@/lib/personality"
import { buildMemoryContext, extractFacts, mergeFacts } from "@/lib/recall"
import {
  isSpeakCommand,
  restoreSample,
  speakInto,
  speakLine,
  stopSpeaking,
} from "@/lib/speak"
import type { ChatMessage, Personality } from "@/lib/types"
import {
  activeConversation,
  addNote,
  countStoredMessages,
  downloadVault,
  loadVault,
  parseImport,
  removeConversation,
  removeNote,
  saveVault,
  startFreshConversation,
  withActiveMessages,
} from "@/lib/vault"

export function MayaApp() {
  const [vault, setVault] = useState(loadVault)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"offline" | "search" | "model">("offline")
  const [follow, setFollow] = useState<FollowAlong | null>(null)
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const retryRef = useRef<string | null>(null)
  const liveRef = useRef<HTMLAudioElement | null>(null)

  const personality = vault.personality
  const conversation = activeConversation(vault)
  const messages = conversation.messages
  const sage = isSage(personality)

  useEffect(() => {
    saveVault(vault)
  }, [vault])

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
    async (text: string, retry = false) => {
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

      const nextMessages = retry ? messages : [...messages, userMessage]
      const facts = retry ? [] : extractFacts(trimmed)
      const learned = retry
        ? vault.learned
        : updateLearned(vault.learned, trimmed)
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
          notes: mergeFacts(withMessages.notes, facts),
          learned,
        }
      })
      setIsSending(true)

      try {
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
            allowSearch: vault.prefs.allowSearch,
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
          reported === "model"
        ) {
          setMode(reported)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("Maya's reply didn't come through.")
        const decoder = new TextDecoder()
        let acc = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          acc += decoder.decode(value, { stream: true })
          const snapshot = acc
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: snapshot }
                : message
            )
          )
        }

        if (vault.prefs.speakReplies && acc.trim()) {
          playVoice(acc, assistantMessage.id)
        }
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return
        setError(
          caught instanceof Error
            ? caught.message
            : "Something went sideways. Try again."
        )
        setMessages((current) =>
          current.filter((message) => message.id !== assistantMessage.id)
        )
      } finally {
        setIsSending(false)
      }
    },
    [messages, personality, playVoice, haltVoice, setMessages, vault]
  )

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
              {mode === "search"
                ? "Looked up"
                : mode === "model"
                  ? "Local model"
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
            onClick={() => downloadVault(vault)}
          >
            <Download />
            <span className="hidden sm:inline">Export</span>
          </Button>
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
          />
        </div>
      )}

      {mode === "search" && !empty ? (
        <p className="px-4 text-center text-xs text-muted-foreground">
          {personality.name} used the web for a fact — not for her voice.
        </p>
      ) : null}
      {mode === "model" && !empty ? (
        <p className="px-4 text-center text-xs text-muted-foreground">
          {personality.name} answered with the local Ollama model on this machine.
        </p>
      ) : null}

      <VoiceDock audioRef={liveRef} status={voiceStatus} />

      <Composer
        name={personality.name}
        disabled={isSending}
        onSend={send}
        speakReplies={vault.prefs.speakReplies === true}
        speaking={Boolean(follow)}
        onStopSpeak={haltVoice}
        onSpeakRepliesChange={(speakReplies) => {
          if (!speakReplies) haltVoice()
          setVault((current) => ({
            ...current,
            prefs: { ...current.prefs, speakReplies },
          }))
        }}
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
