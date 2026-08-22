"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Download, Trash2, Upload } from "lucide-react"

import { ATMOSPHERES } from "@/lib/atmosphere"
import { BONDS, isSage } from "@/lib/bonds"
import { stopSpeaking } from "@/lib/speak"
import { ENERGIES, PERSONALITY_PRESETS, TONES, describeBlend } from "@/lib/personality"
import { describeLearned } from "@/lib/adapt"
import type {
  Conversation,
  Energy,
  LearnedState,
  MemoryNote,
  Personality,
  Prefs,
  Tone,
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { VoicePicker } from "@/components/voice-picker"
import { SageLayers } from "@/components/sage-layers"
import { GoogleConnect } from "@/components/google-connect"

export function SettingsSheet({
  open,
  onOpenChange,
  personality,
  onPersonalityChange,
  prefs,
  onPrefsChange,
  learned,
  onResetLearned,
  notes,
  conversations,
  activeId,
  storedCount,
  deviceSave,
  deviceHint,
  onLoadDevice,
  onExport,
  onImportFile,
  onAddNote,
  onRemoveNote,
  onOpenConversation,
  onRemoveConversation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  personality: Personality
  onPersonalityChange: (next: Personality) => void
  prefs: Prefs
  onPrefsChange: (next: Prefs) => void
  learned: LearnedState
  onResetLearned: () => void
  notes: MemoryNote[]
  conversations: Conversation[]
  activeId: string
  storedCount: number
  deviceSave?: "saving" | "saved" | "error"
  deviceHint?: string | null
  onLoadDevice?: () => void
  onExport: () => void
  onImportFile: (file: File) => Promise<void>
  onAddNote: (text: string) => void
  onRemoveNote: (id: string) => void
  onOpenConversation: (id: string) => void
  onRemoveConversation: (id: string) => void
}) {
  function patch(partial: Partial<Personality>) {
    onPersonalityChange({ ...personality, ...partial })
  }
  const fileRef = useRef<HTMLInputElement>(null)
  const [noteDraft, setNoteDraft] = useState("")
  const [importError, setImportError] = useState<string | null>(null)
  const [lanUrls, setLanUrls] = useState<string[]>([])
  const [modelHint, setModelHint] = useState("Checking for a local model…")
  const [modelReady, setModelReady] = useState(false)
  const [modelBusy, setModelBusy] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [trainHint, setTrainHint] = useState("Checking the trained net…")
  const [trainReady, setTrainReady] = useState(false)
  const [trainBusy, setTrainBusy] = useState(false)
  const [trainError, setTrainError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch("/api/model")
      .then(async (response) => {
        const data = (await response.json()) as {
          available?: boolean
          using?: string | null
          hint?: string
        }
        if (cancelled) return
        setModelReady(Boolean(data.available))
        setModelHint(
          data.hint ||
            (data.using
              ? `${data.using} is ready.`
              : "Ollama is not running on this machine.")
        )
      })
      .catch(() => {
        if (cancelled) return
        setModelReady(false)
        setModelHint("Could not reach the local model endpoint.")
      })
    fetch("/api/train")
      .then(async (response) => {
        const data = (await response.json()) as {
          ready?: boolean
          running?: boolean
          step?: number
          steps?: number
          loss?: number | null
          error?: string | null
        }
        if (cancelled) return
        setTrainReady(Boolean(data.ready))
        setTrainBusy(Boolean(data.running))
        if (data.running) {
          setTrainHint(
            `Training from scratch… step ${data.step ?? 0}/${data.steps ?? 0}${
              data.loss != null ? ` · loss ${data.loss}` : ""
            }`
          )
        } else if (data.ready) {
          setTrainHint(
            data.loss != null
              ? `Checkpoint ready. Last loss ${data.loss}. Chat uses this net first.`
              : "Checkpoint ready. Chat uses this net first."
          )
        } else {
          setTrainHint(
            "No checkpoint yet. Train from chats starts a real transformer at random weights."
          )
        }
        if (data.error) setTrainError(data.error)
      })
      .catch(() => {
        if (!cancelled) setTrainHint("Could not reach the trainer.")
      })
    fetch("/api/runtime")
      .then(async (response) => {
        const data = (await response.json()) as { lan?: string[] }
        if (!cancelled) setLanUrls(data.lan ?? [])
      })
      .catch(() => {
        if (!cancelled) setLanUrls([])
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open || !trainBusy) return
    const timer = window.setInterval(() => {
      void fetch("/api/train")
        .then(async (response) => {
          const data = (await response.json()) as {
            ready?: boolean
            running?: boolean
            step?: number
            steps?: number
            loss?: number | null
            error?: string | null
          }
          setTrainReady(Boolean(data.ready))
          setTrainBusy(Boolean(data.running))
          if (data.running) {
            setTrainHint(
              `Training from scratch… step ${data.step ?? 0}/${data.steps ?? 0}${
                data.loss != null ? ` · loss ${data.loss}` : ""
              }`
            )
          } else if (data.ready) {
            setTrainHint(
              data.loss != null
                ? `Checkpoint ready. Last loss ${data.loss}. Chat uses this net first.`
                : "Checkpoint ready. Chat uses this net first."
            )
          }
          if (data.error) setTrainError(data.error)
        })
        .catch(() => undefined)
    }, 2000)
    return () => window.clearInterval(timer)
  }, [open, trainBusy])

  async function downloadModelfile() {
    setModelBusy(true)
    setModelError(null)
    try {
      const response = await fetch("/api/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personality,
          notes: notes.map((note) => note.text),
        }),
      })
      const data = (await response.json()) as {
        error?: string
        modelfile?: string
        filename?: string
        commands?: string[]
      }
      if (!response.ok || !data.modelfile) {
        throw new Error(data.error || "Could not build a Modelfile.")
      }
      const blob = new Blob([data.modelfile], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = data.filename || "Modelfile"
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      if (data.commands?.length) {
        setModelHint(
          `Saved ${data.filename || "Modelfile"}. Then run:\n${data.commands.join("\n")}`
        )
      }
    } catch (caught) {
      setModelError(
        caught instanceof Error ? caught.message : "Could not build a Modelfile."
      )
    } finally {
      setModelBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-md"
        showCloseButton
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle>Customize {personality.name}</SheetTitle>
          <SheetDescription>
            Shape how she shows up. Changes apply to the next message.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="presence" className="min-h-0 flex-1 overflow-hidden p-0">
          <div className="px-4 pt-3">
            <TabsList className="grid h-auto w-full grid-cols-2 group-data-horizontal/tabs:h-auto sm:grid-cols-4">
              <TabsTrigger value="presence">Presence</TabsTrigger>
              <TabsTrigger value="voice">Voice</TabsTrigger>
              <TabsTrigger value="memory">Memory</TabsTrigger>
              <TabsTrigger value="search">Lookup</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="presence"
            className="min-h-0 overflow-y-auto px-4 py-4"
          >
            <div className="flex flex-col gap-5">
              <Field label="Her name">
                <Input
                  value={personality.name}
                  onChange={(event) => patch({ name: event.target.value })}
                  maxLength={40}
                />
              </Field>
              <Field
                label="What she calls you"
                hint="Sage default is Master. Change it if that isn't the bond."
              >
                <Input
                  value={personality.callMe}
                  onChange={(event) => patch({ callMe: event.target.value })}
                  placeholder="Master"
                  maxLength={40}
                />
              </Field>

              <div>
                <p className="mb-2 text-sm font-medium">The room</p>
                <p className="mb-2 text-xs text-muted-foreground">
                  How the screen feels. Hearth is the warm lamp you already
                  have. Veil and Ink are quieter, more occult — pick one; she
                  will not change the room without you.
                </p>
                <div className="flex flex-col gap-2">
                  {ATMOSPHERES.map((skin) => (
                    <button
                      key={skin.id}
                      type="button"
                      onClick={() =>
                        onPrefsChange({ ...prefs, atmosphere: skin.id })
                      }
                      className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                        (prefs.atmosphere ?? "hearth") === skin.id
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="block text-sm font-medium text-foreground">
                        {skin.label}
                      </span>
                      <span className="block text-[11px]">{skin.promise}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">The bond</p>
                <p className="mb-2 text-xs text-muted-foreground">
                  Inner sage is the Rimuru shape: a mind that stays, analyzes, and does not perform being your pal.
                </p>
                <div className="flex flex-col gap-2">
                  {BONDS.map((bond) => (
                    <button
                      key={bond.id}
                      type="button"
                      onClick={() => patch(bond.patch)}
                      className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                        (personality.bondId ?? "sage") === bond.id
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="block text-sm font-medium text-foreground">
                        {bond.label}
                      </span>
                      <span className="block text-[11px]">{bond.blurb}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium">How she mixes</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {describeBlend(personality)}
                </p>
              </div>

              <RoleSlider
                label="Friend"
                hint="Warmth, loyalty, being on your side"
                value={personality.friend}
                onChange={(friend) => patch({ friend })}
              />
              <RoleSlider
                label="Advisor"
                hint="Honest counsel, useful questions"
                value={personality.advisor}
                onChange={(advisor) => patch({ advisor })}
              />
              <RoleSlider
                label="Companion"
                hint="Presence first. Less fixing."
                value={personality.companion}
                onChange={(companion) => patch({ companion })}
              />

              <Separator />

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Presets</p>
                <div className="flex flex-wrap gap-2">
                  {PERSONALITY_PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-auto rounded-full px-3 py-1.5"
                      onClick={() => patch(preset.patch)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="voice"
            className="min-h-0 overflow-y-auto px-4 py-4"
          >
            <div className="flex flex-col gap-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                She speaks each reply by default. Switch to text only if you
                want silence, then use the speaker on a message when you want
                that line voiced.
              </p>
              <div className="flex items-start justify-between gap-4 rounded-xl bg-muted/60 px-4 py-3">
                <div className="space-y-1 pr-2">
                  <Label htmlFor="speak-replies" className="text-sm">
                    Spoken replies
                  </Label>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    On by default. After her line appears, she reads it aloud
                    and the text follows along. Turn this off for text only —
                    the speaker on each message still works.
                  </p>
                </div>
                <Switch
                  id="speak-replies"
                  checked={prefs.speakReplies !== false}
                  onCheckedChange={(speakReplies) => {
                    if (!speakReplies) stopSpeaking()
                    onPrefsChange({ ...prefs, speakReplies })
                  }}
                />
              </div>
              <p className="rounded-lg bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground ring-1 ring-foreground/8">
                The Great Sage / Raphael performance from That Time I Got
                Reincarnated as a Slime cannot be used — it is a copyrighted
                character voice. Inner sage uses a slower, lower original
                register, not that actress.
              </p>
              <VoicePicker
                sage={isSage(personality)}
                personality={personality}
                prefs={prefs}
                onPick={(voice) => {
                  onPrefsChange({ ...prefs, spokenVoiceURI: "" })
                  patch(
                    (personality.bondId ?? "sage") === "sage"
                      ? {
                          voiceId: voice.id,
                          traits: `${voice.traits} Inner sage register: analysis, then a proposal. Loyalty without noise.`,
                        }
                      : {
                          voiceId: voice.id,
                          tone: voice.tone,
                          energy: voice.energy,
                          traits: voice.traits,
                        }
                  )
                }}
                onSpokenVoice={(spokenVoiceURI) =>
                  onPrefsChange({ ...prefs, spokenVoiceURI })
                }
              />
              <Separator />
              <div>
                <p className="text-sm font-medium">Fine-tune</p>
                <p className="mt-1 mb-2 text-xs text-muted-foreground">
                  After you pick a voice, you can still nudge tone and energy.
                </p>
                <p className="mb-2 text-sm font-medium">Tone</p>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((tone) => (
                    <ChoiceChip
                      key={tone.id}
                      selected={personality.tone === tone.id}
                      label={tone.label}
                      hint={tone.hint}
                      onClick={() => patch({ tone: tone.id as Tone })}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Energy</p>
                <div className="flex flex-wrap gap-2">
                  {ENERGIES.map((energy) => (
                    <ChoiceChip
                      key={energy.id}
                      selected={personality.energy === energy.id}
                      label={energy.label}
                      hint={energy.hint}
                      onClick={() => patch({ energy: energy.id as Energy })}
                    />
                  ))}
                </div>
              </div>
              <Field label="Traits">
                <Textarea
                  value={personality.traits}
                  onChange={(event) => patch({ traits: event.target.value })}
                  rows={3}
                />
              </Field>
              <Field label="Values">
                <Textarea
                  value={personality.values}
                  onChange={(event) => patch({ values: event.target.value })}
                  rows={3}
                />
              </Field>
              <Field
                label="Boundaries"
                hint="Lines she will not cross, even if you push."
              >
                <Textarea
                  value={personality.boundaries}
                  onChange={(event) => patch({ boundaries: event.target.value })}
                  rows={3}
                />
              </Field>
              <Field
                label="Extra instructions"
                hint="Anything else. How she should talk. What she should remember about you."
              >
                <Textarea
                  value={personality.customInstructions}
                  onChange={(event) =>
                    patch({ customInstructions: event.target.value })
                  }
                  rows={4}
                  placeholder="e.g. Be blunt about work. Soften when I'm talking about family."
                />
              </Field>
            </div>
          </TabsContent>

          <TabsContent
            value="memory"
            className="min-h-0 overflow-y-auto px-4 py-4"
          >
            <div className="flex flex-col gap-5">
              <div className="rounded-xl bg-muted/60 p-3">
                <p className="text-sm font-medium">Saved on this device</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {storedCount} messages, {notes.length} notes,{" "}
                  {conversations.filter((item) => item.messages.length).length}{" "}
                  conversations. She writes herself to{" "}
                  <span className="font-medium text-foreground">
                    data/maya-memory.json
                  </span>{" "}
                  in the project folder, and to this browser. You do not need
                  to export for her to remember. Refresh does not reset her.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {deviceSave === "saving"
                    ? "Writing to disk…"
                    : deviceSave === "error"
                      ? "Browser copy is saved. Disk write failed — keep the app folder writable."
                      : "On this computer."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={onExport}>
                  <Download />
                  Spare copy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload />
                  Import file
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ""
                    if (!file) return
                    try {
                      setImportError(null)
                      await onImportFile(file)
                    } catch (error) {
                      setImportError(
                        error instanceof Error
                          ? error.message
                          : "Could not read that file."
                      )
                    }
                  }}
                />
              </div>
              {importError ? (
                <p className="text-sm text-destructive">{importError}</p>
              ) : null}

              <Separator />

              <Field
                label="Something to remember"
                hint="Stable facts. She also picks some up from what you say."
              >
                <div className="flex gap-2">
                  <Input
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    placeholder="I live in Hyderabad. Evenings are for family."
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        onAddNote(noteDraft)
                        setNoteDraft("")
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onAddNote(noteDraft)
                      setNoteDraft("")
                    }}
                  >
                    Save
                  </Button>
                </div>
              </Field>

              {notes.length ? (
                <ul className="flex flex-col gap-2">
                  {notes.map((note) => (
                    <li
                      key={note.id}
                      className="flex items-start justify-between gap-2 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-foreground/8"
                    >
                      <span className="min-w-0 flex-1 leading-6">{note.text}</span>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Forget this"
                        onClick={() => onRemoveNote(note.id)}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No notes yet. Talk, or write one above.
                </p>
              )}

              <Separator />

              <div>
                <p className="text-sm font-medium">Conversations</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  New starts a fresh thread. The old one stays here.
                </p>
              </div>
              <ul className="flex flex-col gap-2">
                {conversations.map((conversation) => (
                  <li
                    key={conversation.id}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ${
                      conversation.id === activeId
                        ? "bg-primary/15 ring-primary/30"
                        : "bg-card ring-foreground/8"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left"
                      onClick={() => {
                        onOpenConversation(conversation.id)
                        onOpenChange(false)
                      }}
                    >
                      {conversation.title}
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {conversation.messages.length} messages
                      </span>
                    </button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Remove conversation"
                      onClick={() => onRemoveConversation(conversation.id)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent
            value="search"
            className="min-h-0 overflow-y-auto px-4 py-4"
          >
            <div className="flex flex-col gap-5">
              <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/8">
                <p className="text-sm font-medium">Body around the model</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You do not need to train Llama from scratch for this. Sage
                  core is the nervous system: tools, memory, Python, files,
                  confirm-before-act. The brain is Ollama (or the small net
                  you trained).
                </p>
                <div className="mt-3 max-h-64 overflow-y-auto">
                  <SageLayers compact />
                </div>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <Label htmlFor="allow-python" className="text-sm">
                      Always allow Python
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Off = she asks first. Sandbox is data/workspace, 8s cap.
                    </p>
                  </div>
                  <Switch
                    id="allow-python"
                    checked={prefs.allowPython === true}
                    onCheckedChange={(allowPython) =>
                      onPrefsChange({ ...prefs, allowPython })
                    }
                  />
                </div>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <Label htmlFor="allow-write" className="text-sm">
                      Always allow file writes
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Reads are always on. Writes stay in data/workspace.
                    </p>
                  </div>
                  <Switch
                    id="allow-write"
                    checked={prefs.allowFileWrite === true}
                    onCheckedChange={(allowFileWrite) =>
                      onPrefsChange({ ...prefs, allowFileWrite })
                    }
                  />
                </div>
              </div>

              <GoogleConnect
                allowWrite={prefs.allowGoogleWrite === true}
                onAllowWrite={(allowGoogleWrite) =>
                  onPrefsChange({ ...prefs, allowGoogleWrite })
                }
              />

              <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/60 p-3">
                <div>
                  <p className="text-sm font-medium">Look up world facts</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    On by default. She searches DuckDuckGo, Wikipedia, and
                    public GitHub when a question needs the outside world —
                    including your public profile if she has a name or
                    handle. She does not drive Chrome. If lookup fails she
                    gives you a Google link. She still will not invent a CV.
                  </p>
                </div>
                <Switch
                  checked={prefs.allowSearch}
                  onCheckedChange={(allowSearch) =>
                    onPrefsChange({ ...prefs, allowSearch })
                  }
                />
              </div>

              <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/8">
                <p className="text-sm font-medium">Train from scratch</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  A real transformer, random weights, trained on the seed
                  dialogues plus your chats. About two minutes on a laptop
                  CPU. It will not become Llama. A giant model from zero
                  still needs a GPU farm. This one is yours.
                </p>
                <p className="mt-2 text-sm whitespace-pre-wrap">{trainHint}</p>
                {trainError ? (
                  <p className="mt-2 text-sm text-destructive">{trainError}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={trainBusy}
                    onClick={() => {
                      setTrainBusy(true)
                      setTrainError(null)
                      setTrainHint("Starting trainer…")
                      void fetch("/api/train", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ steps: 1200 }),
                      })
                        .then(async (response) => {
                          const data = (await response.json()) as {
                            error?: string
                          }
                          if (!response.ok) {
                            throw new Error(data.error || "Train failed to start.")
                          }
                          setTrainHint("Training from random weights. Keep this tab open.")
                        })
                        .catch((caught: unknown) => {
                          setTrainBusy(false)
                          setTrainError(
                            caught instanceof Error
                              ? caught.message
                              : "Train failed to start."
                          )
                        })
                    }}
                  >
                    {trainBusy ? "Training…" : trainReady ? "Train again" : "Train from chats"}
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                    <Label htmlFor="use-trained" className="text-xs">
                      Use trained net
                    </Label>
                    <Switch
                      id="use-trained"
                      checked={prefs.useTrainedBrain !== false}
                      onCheckedChange={(useTrainedBrain) =>
                        onPrefsChange({ ...prefs, useTrainedBrain })
                      }
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  CLI: pip install -r requirements-train.txt && python3
                  train/train.py
                </p>
              </div>

              <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/8">
                <p className="text-sm font-medium">Ollama (smarter backup)</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  If the trained net is off or missing, she can still use{" "}
                  <a
                    href="https://ollama.com"
                    className="underline underline-offset-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ollama
                  </a>
                  . Pull llama3.2, then bake personality into a Modelfile.
                </p>
                <p
                  className={`mt-2 text-sm whitespace-pre-wrap ${modelReady ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {modelHint}
                </p>
                {modelError ? (
                  <p className="mt-2 text-sm text-destructive">{modelError}</p>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  disabled={modelBusy}
                  onClick={() => void downloadModelfile()}
                >
                  {modelBusy ? "Building…" : "Download Modelfile"}
                </Button>
              </div>

              <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/8">
                <p className="text-sm font-medium">On-device model (phones)</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Free. Runs in Chrome/Edge with WebGPU. First load downloads
                  about 0.9 GB once, then works offline. No paid API.
                </p>
                {deviceHint ? (
                  <p className="mt-2 text-sm whitespace-pre-wrap">{deviceHint}</p>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Prefer this when Ollama is not running
                  </p>
                  <Switch
                    checked={prefs.onDeviceModel !== false}
                    onCheckedChange={(onDeviceModel) =>
                      onPrefsChange({ ...prefs, onDeviceModel })
                    }
                  />
                </div>
                {onLoadDevice ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={onLoadDevice}
                  >
                    Load on-device brain
                  </Button>
                ) : null}
              </div>

              {lanUrls.length ? (
                <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/8">
                  <p className="text-sm font-medium">Open on your phone</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Same Wi‑Fi. Chrome or Safari, then Add to Home Screen.
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {lanUrls.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          className="break-all underline underline-offset-2"
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/8">
                <p className="text-sm font-medium">How she&apos;s adapting</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {describeLearned(learned)}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={onResetLearned}
                >
                  Reset what she learned
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function RoleSlider({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{value}</span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={100}
        onValueChange={(next) =>
          onChange(Array.isArray(next) ? (next[0] ?? value) : next)
        }
      />
    </div>
  )
}

function ChoiceChip({
  selected,
  label,
  hint,
  onClick,
}: {
  selected: boolean
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <span className="block text-[11px]">{hint}</span>
    </button>
  )
}
