"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Calculator,
  CloudOff,
  Cpu,
  Music2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wifi,
} from "lucide-react"

import { CalcSheet } from "@/components/calc-sheet"
import { ChatThread, type FollowAlong } from "@/components/chat-thread"
import { Composer } from "@/components/composer"
import { EmptyState } from "@/components/empty-state"
import {
  loadNowPlaying,
  MusicDock,
  saveNowPlaying,
} from "@/components/music-dock"
import { MayaMark } from "@/components/maya-mark"
import { PlannerDock } from "@/components/planner-dock"
import { SettingsSheet } from "@/components/settings-sheet"
import { isMusicQuery, musicQuery, youtubeSearchUrl, type MusicTrack } from "@/lib/music"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DEFAULT_LEARNED, updateLearned } from "@/lib/adapt"
import { ATMOSPHERES, atmosphereClass } from "@/lib/atmosphere"
import { isSage } from "@/lib/bonds"
import { newId } from "@/lib/id"
import { describePresence } from "@/lib/personality"
import {
  factsFromUtterance,
  PRESENCE_LABEL,
  upsertFact,
  type Presence,
} from "@/lib/mind"
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
  unlockSpeech,
} from "@/lib/speak"
import { voiceById } from "@/lib/voices"
import { hometownFromNotes, isClearScreenCommand, isDirectionsQuery, isMapsQuery, lastPlaceFromMessages, mapsQuery } from "@/lib/skills"
import { googleMapsDirUrl, googleMapsSearchUrl } from "@/lib/maps"
import { openMapsWindow, openYoutubeWindow, readBrowserOrigin } from "@/lib/geo"
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

async function putReminderOnGoogle(item: Reminder) {
  try {
    const response = await fetch("/api/google/reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: item.text, when: item.at }),
    })
    const data = (await response.json()) as {
      ok?: boolean
      summary?: string
      detail?: string
    }
    const summary = data.summary?.trim()
    return {
      note: summary ? `\n\n${summary}${data.detail ? `\n${data.detail}` : ""}` : "",
      link: data.detail,
    }
  } catch {
    return {
      note: "\n\nCould not reach Google Calendar. The reminder is still set in this tab.",
      link: undefined,
    }
  }
}
import type { ChatMessage, Personality, Reminder } from "@/lib/types"
import {
  activeConversation,
  addNote,
  countStoredMessages,
  downloadVault,
  bootVault,
  keepLiveVault,
  loadVault,
  parseImport,
  patchReminder,
  patchTask,
  removeConversation,
  removeFact,
  removeNote,
  removePlan,
  removeReadingItem,
  replaceFacts,
  saveVault,
  startFreshConversation,
  upsertPlan,
  upsertReadingItem,
  upsertReminder,
  upsertTask,
  withActiveMessages,
} from "@/lib/vault"
import { hydrateVault, writeDeviceMemory } from "@/lib/persist"

export function MayaApp() {
  const [vault, setVault] = useState(bootVault)
  const [bootReady, setBootReady] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const [musicOpen, setMusicOpen] = useState(false)
  const [track, setTrack] = useState<MusicTrack | null>(null)
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
  const [presence, setPresence] = useState<Presence>("idle")
  const [ticks, setTicks] = useState<string[]>([])
  const [wakeNote, setWakeNote] = useState<string | null>(null)
  const [deviceSave, setDeviceSave] = useState<"saving" | "saved" | "error">(
    "saved"
  )
  const abortRef = useRef<AbortController | null>(null)
  const retryRef = useRef<string | null>(null)
  const liveRef = useRef<HTMLAudioElement | null>(null)
  const hydratedRef = useRef(false)
  const vaultRef = useRef(vault)
  const sendingLock = useRef(false)
  const sendGen = useRef(0)
  const lastDestRef = useRef<string | null>(null)
  const mapsWinRef = useRef<Window | null>(null)
  const youtubeWinRef = useRef<Window | null>(null)
  vaultRef.current = vault

  const personality = vault.personality
  const conversation = activeConversation(vault)
  const messages = conversation.messages
  const sage = isSage(personality)

  useEffect(() => {
    const root = document.documentElement
    for (const skin of ATMOSPHERES) {
      root.classList.remove(atmosphereClass(skin.id))
    }
    root.classList.add(atmosphereClass(vault.prefs.atmosphere ?? "hearth"))
  }, [vault.prefs.atmosphere])

  useEffect(() => {
    setGpuOk(canRunOnDevice())
    setVault((current) => keepLiveVault(current, loadVault()))
    setBootReady(true)
    let cancelled = false
    void hydrateVault().then((next) => {
      if (cancelled) return
      hydratedRef.current = true
      setVault((current) => {
        if (sendingLock.current) return current
        return keepLiveVault(current, next)
      })
    })
    setTrack(loadNowPlaying())
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        void navigator.serviceWorker.getRegistrations().then((regs) =>
          Promise.all(regs.map((reg) => reg.unregister()))
        )
      } else {
        void navigator.serviceWorker.register("/sw.js")
      }
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
    const start = () => {
      void fetch("/api/model")
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
    }
    if (typeof requestIdleCallback === "function") {
      const idle = requestIdleCallback(start)
      return () => {
        cancelled = true
        cancelIdleCallback(idle)
      }
    }
    const timeout = window.setTimeout(start, 600)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
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
    setPresence("idle")
  }, [])

  const playVoice = useCallback(
    async (text: string, messageId: string) => {
      const audio = liveRef.current
      stopSpeaking()
      unlockSpeech()
      setFollow({ messageId, charIndex: 0 })

      const chosen = voiceById(personality.voiceId)
      const started = speakLine(text, {
        voiceURI: vault.prefs.spokenVoiceURI,
        langHints: chosen.langHints,
        nameHints: chosen.nameHints,
        sage,
        onBoundary: (charIndex) => setFollow({ messageId, charIndex }),
        onEnd: () => {
          setFollow((current) =>
            current?.messageId === messageId ? null : current
          )
          setPresence("idle")
        },
      })
      if (started) {
        setPresence("speaking")
        return
      }

      if (audio) {
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
          setPresence("idle")
        }
        try {
          const result = await speakInto(audio, text, sage)
          if (result === "playing") {
            setPresence("speaking")
            return
          }
        } catch {
          /* nothing else to try */
        }
      }
      setFollow(null)
      setPresence("idle")
    },
    [sage, vault.prefs.spokenVoiceURI, personality.voiceId]
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

  useEffect(() => {
    const key = "maya:sleep-at"
    const onHide = () => {
      try {
        sessionStorage.setItem(key, String(Date.now()))
      } catch {
        /* ignore */
      }
    }
    const onShow = () => {
      try {
        const left = Number(sessionStorage.getItem(key) || "0")
        sessionStorage.removeItem(key)
        if (!left || Date.now() - left < 45_000) return
        const current = vaultRef.current
        const due = (current.reminders ?? []).filter(
          (item) => !item.done && item.at <= Date.now()
        ).length
        const openPlans = (current.plans ?? []).filter((plan) =>
          plan.steps.some((step) => !step.done)
        ).length
        const bits = [
          due ? `${due} reminder${due === 1 ? "" : "s"} became due` : "",
          openPlans
            ? `${openPlans} planned task${openPlans === 1 ? "" : "s"} still open`
            : "",
        ].filter(Boolean)
        setWakeNote(
          bits.length
            ? `While you were away: ${bits.join("; ")}. Nothing else was accessed.`
            : "Welcome back. Nothing ran in the background."
        )
      } catch {
        /* ignore */
      }
    }
    const onVis = () => {
      if (document.hidden) onHide()
      else onShow()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [])

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

      const snapshot = vaultRef.current
      const personalityNow = snapshot.personality
      const existing = activeConversation(snapshot).messages

      if (isSpeakCommand(trimmed)) {
        const last = existing.filter(
          (message) => message.role === "assistant" && message.content
        ).at(-1)
        if (last) playVoice(last.content, last.id)
        return
      }

      const meaning = intendedMeaning(trimmed)
      if (isClearScreenCommand(trimmed) || isClearScreenCommand(meaning)) {
        abortRef.current?.abort()
        haltVoice()
        setVault((current) => startFreshConversation(current))
        setError(null)
        setIsSending(false)
        setPresence("idle")
        setTicks([])
        return
      }

      abortRef.current?.abort()
      sendingLock.current = true
      const gen = ++sendGen.current

      try {
        haltVoice()
        unlockSpeech()
      } catch {
        /* sending still works if voice teardown fails */
      }

      const abort = new AbortController()
      abortRef.current = abort
      retryRef.current = trimmed
      setError(null)
      setIsSending(true)
      setPresence("thinking")
      setTicks(["Understanding request", "Checking memory"])
      const mapsAsk = isMapsQuery(meaning) || isMapsQuery(trimmed)
      const musicAsk = isMusicQuery(meaning) || isMusicQuery(trimmed)
      if (mapsAsk) {
        try {
          mapsWinRef.current = window.open("about:blank", "maya-maps")
        } catch {
          mapsWinRef.current = null
        }
      }
      if (musicAsk) {
        const song = musicQuery(meaning) || musicQuery(trimmed)
        try {
          youtubeWinRef.current = openYoutubeWindow(
            song ? youtubeSearchUrl(song) : "https://www.youtube.com",
            youtubeWinRef.current
          )
        } catch {
          youtubeWinRef.current = null
        }
      }

      const approved =
        typeof retry === "object" ? retry.approved : undefined
      const isRedo = retry !== false
      const userMessage: ChatMessage = {
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
        approved && existing.at(-1)?.role === "assistant"
          ? existing.slice(0, -1)
          : existing
      const nextMessages: ChatMessage[] = isRedo
        ? source
        : [...source.filter((item) => item.id !== assistantMessage.id), userMessage]

      if (!nextMessages.length || nextMessages.at(-1)?.role !== "user") {
        sendingLock.current = false
        setIsSending(false)
        setError("Say something, then tap send — Enter also sends.")
        return
      }

      const facts = isRedo ? [] : extractFacts(trimmed)
      const spokenFacts = isRedo ? [] : factsFromUtterance(trimmed)
      const learned = isRedo
        ? snapshot.learned
        : updateLearned(snapshot.learned, trimmed)

      setVault((latest) => {
        const withMessages = withActiveMessages(latest, [
          ...nextMessages,
          assistantMessage,
        ])
        let nextFacts = withMessages.facts ?? []
        for (const fact of spokenFacts) {
          nextFacts = upsertFact(nextFacts, fact)
        }
        return {
          ...withMessages,
          notes: upsertDigest(mergeFacts(withMessages.notes, facts), [
            ...nextMessages,
            assistantMessage,
          ]),
          learned,
          facts: nextFacts,
        }
      })

      const plan = isRedo ? null : parsePlan(intendedMeaning(trimmed))

      try {
        if (plan) {
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "default" &&
            (plan.kind === "reminder" || plan.kind === "alarm")
          ) {
            void Notification.requestPermission()
          }

          let reply = ""
          let apply = (current: typeof snapshot) => current
          if (plan.kind === "need-time") {
            reply =
              "Tell me when — in 10 minutes, at 7pm, tomorrow at 9. I’ll hold it in this tab and ping you here. The service-account JSON is not enough on its own: share your Google Calendar with the robot email as “Make changes to events” (Customize → Lookup shows the email), then ask again."
          } else if (plan.kind === "reminder" || plan.kind === "alarm") {
            const item = makeReminder(plan)
            const google = await putReminderOnGoogle(item)
            if (google.link) item.calendarUrl = google.link
            const fallback = googleCalendarUrl(item.text, item.at)
            reply = `Set. ${item.kind === "alarm" ? "Alarm" : "Reminder"} for ${formatWhen(item.at)}: ${item.text}. I’ll speak it here if this tab is open.${
              google.note || `\n\nOptional — add it in Google Calendar:\n${fallback}`
            }`
            apply = (current) => upsertReminder(current, item)
          } else if (plan.kind === "task") {
            const item = makeTask(plan.label)
            reply = `On the list: ${item.text}. Say “what’s on my list” anytime, or “mark ${item.text} done”.`
            apply = (current) => upsertTask(current, item)
          } else if (plan.kind === "task-done") {
            const match = (snapshot.tasks ?? []).find((item) =>
              item.text.toLowerCase().includes(plan.label.toLowerCase())
            )
            if (match) {
              reply = `Checked off: ${match.text}.`
              apply = (current) => patchTask(current, match.id, { done: true })
            } else {
              reply = `I don’t see “${plan.label}” on the list. Say “add a task: …” first.`
            }
          } else {
            const rems = (snapshot.reminders ?? []).filter((item) => !item.done)
            const todos = (snapshot.tasks ?? []).filter((item) => !item.done)
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
          setVault((latest) => {
            const withMsgs = withActiveMessages(apply(latest), filled)
            return {
              ...withMsgs,
              notes: upsertDigest(mergeFacts(withMsgs.notes, facts), filled),
              learned,
            }
          })
          if (snapshot.prefs.speakReplies !== false) {
            setPresence("speaking")
            playVoice(reply, assistantMessage.id)
          } else {
            setPresence("idle")
          }
          return
        }

        const hometownNow = hometownFromNotes(
          snapshot.notes.map((note) => note.text)
        )
        const lastPlace =
          lastDestRef.current || lastPlaceFromMessages(existing) || undefined
        let origin: { lat: number; lon: number } | undefined
        if (mapsAsk) {
          const dest =
            mapsQuery(meaning, hometownNow, lastPlace) ||
            mapsQuery(trimmed, hometownNow, lastPlace)
          if (dest) {
            lastDestRef.current = dest
            const firstUrl = isDirectionsQuery(meaning) || isDirectionsQuery(trimmed)
              ? googleMapsDirUrl(dest)
              : googleMapsSearchUrl(dest)
            openMapsWindow(firstUrl, mapsWinRef.current)
            void readBrowserOrigin(900).then((here) => {
              if (!here) return
              origin = here
              if (isDirectionsQuery(meaning) || isDirectionsQuery(trimmed)) {
                openMapsWindow(googleMapsDirUrl(dest, here), mapsWinRef.current)
              }
            })
          }
        }

        const memory = buildMemoryContext(
          { ...snapshot, notes: mergeFacts(snapshot.notes, facts), learned },
          nextMessages
        )

        const identity = readPublicIdentity(
          [
            ...snapshot.notes.map((note) => note.text),
            ...nextMessages
              .filter((message) => message.role === "user")
              .map((message) => message.content),
          ],
          personalityNow.callMe
        )
        const keepLearned = (extra: unknown) => {
          if (!Array.isArray(extra)) return
          const lines = extra.filter(
            (line): line is string =>
              typeof line === "string" && line.trim().length > 4
          )
          if (!lines.length) return
          setVault((latest) => ({
            ...latest,
            notes: mergeFacts(latest.notes, lines),
          }))
        }

        let acc = ""
        const useDevice =
          !online &&
          !modelReady &&
          snapshot.prefs.onDeviceModel !== false &&
          Boolean(deviceId)

        if (useDevice) {
          try {
            let hits: import("@/lib/types").SearchHit[] = []
            let searched = false
            if (snapshot.prefs.allowSearch && online) {
              const looked = await fetch("/api/lookup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: abort.signal,
                body: JSON.stringify({
                  text: trimmed,
                  hometown: hometownFromNotes(
                    snapshot.notes.map((note) => note.text)
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
            const { replyOnDevice } = await import("@/lib/device-runtime")
            const deviceText = await replyOnDevice({
              messages: nextMessages,
              personality: personalityNow,
              memory,
              hits,
              onToken: (chunk) => {
                acc = chunk
                setMessages((latest) =>
                  latest.map((message) =>
                    message.id === assistantMessage.id
                      ? { ...message, content: chunk }
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
          setTicks((current) =>
            current.includes("Preparing answer")
              ? current
              : [...current, "Preparing answer"]
          )
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: abort.signal,
            body: JSON.stringify({
              messages: nextMessages.map((message) => ({
                role: message.role,
                content: message.content,
              })),
              personality: personalityNow,
              memory,
              learned,
              allowSearch: snapshot.prefs.allowSearch && online,
              useTrained: snapshot.prefs.useTrainedBrain !== false,
              allowPython: snapshot.prefs.allowPython === true,
              allowFileWrite: snapshot.prefs.allowFileWrite === true,
              allowGoogleWrite: snapshot.prefs.allowGoogleWrite === true,
              approved,
              origin,
              lastPlace,
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
          try {
            const packed = response.headers.get("X-Maya-Facts")
            if (packed) {
              const items = JSON.parse(packed) as Array<
                import("@/lib/mind").MindFact
              >
              if (Array.isArray(items)) {
                setVault((current) => replaceFacts(current, items))
              }
            }
          } catch {
            /* ignore bad facts payload */
          }
          try {
            const packed = response.headers.get("X-Maya-Plan")
            if (packed) {
              const plan = JSON.parse(packed) as import("@/lib/mind").MindPlan
              if (plan?.id && plan.goal && Array.isArray(plan.steps)) {
                setVault((current) => upsertPlan(current, plan))
              }
            }
          } catch {
            /* ignore bad plan payload */
          }
          try {
            const packed = response.headers.get("X-Maya-Reading")
            if (packed) {
              const items = JSON.parse(packed) as Array<
                import("@/lib/otaku").ReadingItem
              >
              if (Array.isArray(items) && items.length) {
                setVault((current) =>
                  items.reduce(
                    (next, item) =>
                      item?.title ? upsertReadingItem(next, item) : next,
                    current
                  )
                )
              }
            }
          } catch {
            /* ignore bad shelf payload */
          }
          let tools: ChatMessage["tools"]
          let pending: ChatMessage["pending"]
          try {
            const packed = response.headers.get("X-Maya-Tools")
            if (packed) {
              tools = JSON.parse(packed) as ChatMessage["tools"]
              const names = (tools ?? []).map((item) => item.name)
              if (names.some((name) => ["lookup", "weather", "news", "maps", "otaku", "fetch_page"].includes(name))) {
                setPresence("searching")
                setTicks((current) =>
                  current.includes("Searching web")
                    ? current
                    : [...current, "Searching web"]
                )
              } else if (names.some((name) => name !== "recall" && name !== "mind")) {
                setPresence("executing")
                setTicks((current) =>
                  current.includes("Using a tool")
                    ? current
                    : [...current, "Using a tool"]
                )
              }
            }
          } catch {
            /* ignore */
          }
          try {
            const packed = response.headers.get("X-Maya-Music")
            if (packed) {
              const next = JSON.parse(packed) as MusicTrack
              if (next?.url) {
                setTrack(next)
                saveNowPlaying(next)
                setMusicOpen(true)
                openYoutubeWindow(next.url, youtubeWinRef.current)
              }
            }
          } catch {
            /* ignore bad music payload */
          }
          const mapsUrl = response.headers.get("X-Maya-Maps")
          if (mapsUrl && /^https:\/\/(www\.)?google\.com\/maps\//.test(mapsUrl)) {
            openMapsWindow(mapsUrl, mapsWinRef.current)
          } else if (isMapsQuery(trimmed) && mapsWinRef.current && !mapsWinRef.current.closed) {
            try {
              if (mapsWinRef.current.location.href === "about:blank") {
                mapsWinRef.current.close()
              }
            } catch {
              /* window already left about:blank */
            }
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
            const streamed = acc
            setMessages((latest) =>
              latest.map((message) =>
                message.id === assistantMessage.id
                  ? { ...message, content: streamed, tools, pending }
                  : message
              )
            )
          }
        }

        if (snapshot.prefs.speakReplies !== false && acc.trim()) {
          playVoice(acc, assistantMessage.id)
        }
      } catch (caught) {
        setMessages((latest) =>
          latest.filter((message) => message.id !== assistantMessage.id)
        )
        if ((caught as Error).name === "AbortError") return
        setPresence("error")
        setError(
          caught instanceof Error
            ? caught.message
            : "Something went sideways. Try again."
        )
      } finally {
        if (gen === sendGen.current) {
          sendingLock.current = false
          setIsSending(false)
          setTicks([])
          setPresence((current) =>
            current === "speaking" || current === "error" ? current : "idle"
          )
        }
      }
    },
    [playVoice, haltVoice, setMessages, modelReady, online, deviceId]
  )

  const loadDevice = useCallback(async () => {
    setDeviceHint("Preparing the on-device model…")
    try {
      const { loadOnDeviceModel } = await import("@/lib/device-runtime")
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
        if (file.size > 8_000_000) {
          setError(`${file.name} is larger than 8 MB.`)
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
      const audio = saved.filter((name) =>
        /\.(wav|mp3|m4a|aac|ogg|webm|flac)$/i.test(name)
      )
      void send(
        audio.length
          ? `I added ${saved.join(", ")} to your workspace. Give me the notes in this clip.`
          : `I added ${saved.join(", ")} to your workspace. List your files and tell me what you have.`
      )
    }
  }

  async function shareScreen() {
    let embedded = false
    try {
      embedded = window.self !== window.top
    } catch {
      embedded = true
    }
    if (embedded) {
      setError(
        "Screen capture is blocked inside this embedded preview. Open Maya in its own tab, or attach a screenshot with the paperclip."
      )
      return
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError(
        "This browser cannot capture a screen still. Use the paperclip to attach a screenshot instead."
      )
      return
    }
    setError("Allow screen capture in the browser prompt, then pick a window.")
    try {
      const stream = await Promise.race([
        navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => {
            const err = new Error(
              "Screen capture did not start. Allow it in the prompt, or attach a screenshot with the paperclip."
            )
            err.name = "TimeoutError"
            reject(err)
          }, 15000)
        }),
      ])
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
      <header className="relative z-40 shrink-0 border-b border-border/80 bg-background/95 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2" title={personality.name}>
            <MayaMark className="size-9 shrink-0 text-primary" />
            <h1 className="font-heading truncate text-lg font-medium tracking-tight">
              {personality.name}
            </h1>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex gap-1"
              title={
                !online
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
                            : "On this machine"
              }
            >
              {!online ? (
                <CloudOff className="size-3.5" />
              ) : mode === "search" ? (
                <Search className="size-3.5" />
              ) : mode === "trained" || mode === "model" || mode === "device" ? (
                <Cpu className="size-3.5" />
              ) : mode === "sage" ? (
                <Sparkles className="size-3.5" />
              ) : (
                <Wifi className="size-3.5" />
              )}
              <span className="sr-only">
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
              </span>
            </Badge>
            <Badge
              variant="secondary"
              className="hidden sm:inline-flex"
              title={PRESENCE_LABEL[presence]}
            >
              <span
                className={`size-1.5 rounded-full ${
                  presence === "error"
                    ? "bg-destructive"
                    : presence === "idle"
                      ? "bg-primary/70"
                      : "bg-primary animate-pulse"
                }`}
              />
              <span className="sr-only">{PRESENCE_LABEL[presence]}</span>
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {describePresence(personality)}
          </p>
        </div>
        <nav
          className="relative z-40 flex flex-wrap items-center justify-end gap-1.5"
          aria-label="Maya"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setCalcOpen(true)}
            aria-label="Open calculator"
            title="Calculator"
          >
            <Calculator />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMusicOpen(true)}
            aria-label="Open music player"
            title="Music"
          >
            <Music2 />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={startOver}
            aria-label="Start a new chat. Memory stays."
            title="New chat"
          >
            <RotateCcw />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label="Customize Maya"
            title="Customize"
          >
            <SlidersHorizontal />
          </Button>
        </nav>
        </div>
      </header>

      <div className="relative z-0 min-h-0 flex-1 overflow-y-auto">
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
          atmosphere={vault.prefs.atmosphere ?? "hearth"}
          onAtmosphere={(atmosphere) =>
            setVault((current) => ({
              ...current,
              prefs: { ...current.prefs, atmosphere },
            }))
          }
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ChatThread
            messages={messages}
            companionName={personality.name}
            isThinking={isSending && !messages.at(-1)?.content}
            ticks={ticks}
            error={error}
            follow={follow}
            onSpeak={playVoice}
            onStopSpeak={haltVoice}
            onRetry={() => {
              const last = retryRef.current
              if (last) void send(last, true)
            }}
            onPlayMusic={(next) => {
              setTrack(next)
              saveNowPlaying(next)
              setMusicOpen(true)
              openYoutubeWindow(next.url)
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
      </div>

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

      {track ? (
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 pb-1">
          <button
            type="button"
            className="min-w-0 flex-1 truncate rounded-xl bg-card px-3 py-2 text-left text-sm ring-1 ring-foreground/8"
            onClick={() => setMusicOpen(true)}
          >
            <span className="text-muted-foreground">Now playing · </span>
            {track.title}
          </button>
        </div>
      ) : null}

      <audio
        ref={liveRef}
        className="hidden"
        preload="none"
        playsInline
      />

      {wakeNote ? (
        <p className="mx-auto max-w-2xl px-4 pb-1 text-center text-xs text-muted-foreground">
          {wakeNote}{" "}
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => setWakeNote(null)}
          >
            Dismiss
          </button>
        </p>
      ) : null}

      <PlannerDock
        reminders={vault.reminders ?? []}
        tasks={vault.tasks ?? []}
        plans={vault.plans ?? []}
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
          sendingLock.current = false
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
        facts={vault.facts ?? []}
        plans={vault.plans ?? []}
        reading={vault.reading ?? []}
        conversations={vault.conversations}
        activeId={vault.activeId}
        storedCount={countStoredMessages(vault)}
        deviceSave={deviceSave}
        deviceHint={deviceHint}
        onLoadDevice={() => void loadDevice()}
        onExport={() => downloadVault(vault)}
        onImportFile={importMemory}
        onAddNote={(text) =>
          setVault((current) => {
            const withNote = addNote(current, text)
            const extra = factsFromUtterance(text)
            let nextFacts = withNote.facts ?? []
            if (extra.length) {
              for (const fact of extra) {
                nextFacts = upsertFact(nextFacts, { ...fact, source: "user", confidence: 0.9 })
              }
            } else if (text.trim().length > 6) {
              nextFacts = upsertFact(nextFacts, {
                text: text.trim().slice(0, 140),
                kind: "fact",
                confidence: 0.9,
                source: "user",
                lastConfirmed: Date.now(),
                mentions: 1,
              })
            }
            return replaceFacts(withNote, nextFacts)
          })
        }
        onRemoveNote={(id) => setVault((current) => removeNote(current, id))}
        onRemoveFact={(id) => setVault((current) => removeFact(current, id))}
        onRemovePlan={(id) => setVault((current) => removePlan(current, id))}
        onRemoveReading={(id) =>
          setVault((current) => removeReadingItem(current, id))
        }
        onOpenConversation={(id) =>
          setVault((current) => ({ ...current, activeId: id }))
        }
        onRemoveConversation={(id) =>
          setVault((current) => removeConversation(current, id))
        }
      />
      <CalcSheet open={calcOpen} onOpenChange={setCalcOpen} />
      <MusicDock
        open={musicOpen}
        onOpenChange={setMusicOpen}
        track={track}
        onTrack={(next) => {
          setTrack(next)
          saveNowPlaying(next)
        }}
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
