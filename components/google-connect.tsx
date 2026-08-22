"use client"

import { useEffect, useState, type ReactNode } from "react"

import {
  GmailMark,
  GoogleCalendarMark,
  GoogleContactsMark,
  GoogleDocsMark,
  GoogleDriveMark,
  GoogleMark,
  GoogleSheetsMark,
  GoogleTasksMark,
} from "@/components/brand-marks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type GoogleStatus = {
  hasClient?: boolean
  connected?: boolean
  email?: string | null
  serviceAccount?: string | null
  canGmail?: boolean
  canCalendar?: boolean
  canDrive?: boolean
  canTasks?: boolean
  canContacts?: boolean
  calendarWritable?: boolean
  calendars?: Array<{ id: string; summary: string; role: string }>
  shareHint?: string
  note?: string
  redirectUri?: string
  error?: string
}

export function GoogleConnect({
  allowWrite,
  onAllowWrite,
}: {
  allowWrite: boolean
  onAllowWrite: (next: boolean) => void
}) {
  const [status, setStatus] = useState<GoogleStatus | null>(null)
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function load() {
    void fetch("/api/google")
      .then(async (response) => {
        const data = (await response.json()) as GoogleStatus
        setStatus(data)
      })
      .catch(() => setStatus({ note: "Could not read Google status." }))
  }

  useEffect(() => {
    load()
    const params = new URLSearchParams(window.location.search)
    const flag = params.get("google")
    if (flag === "connected") setHint("Google is connected. Ask about your calendar or inbox.")
    if (flag === "denied") setHint("Google sign-in was cancelled.")
    if (flag === "token") setHint("Google gave back an error exchanging the code. Check the redirect URI.")
    if (flag === "state") setHint("The Google sign-in expired. Try Connect again.")
  }, [])

  async function saveClient() {
    setBusy(true)
    setHint(null)
    try {
      const response = await fetch("/api/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      })
      const data = (await response.json()) as GoogleStatus
      if (!response.ok) throw new Error(data.error || "Could not save the client.")
      setStatus(data)
      setHint("Saved. Now Connect Google.")
      setClientSecret("")
    } catch (caught) {
      setHint(caught instanceof Error ? caught.message : "Could not save.")
    } finally {
      setBusy(false)
    }
  }

  async function connect() {
    setBusy(true)
    setHint(null)
    try {
      const response = await fetch("/api/google/connect?json=1", {
        headers: { Accept: "application/json" },
      })
      const data = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !data.url) throw new Error(data.error || "Could not start Google sign-in.")
      window.location.href = data.url
    } catch (caught) {
      setBusy(false)
      setHint(caught instanceof Error ? caught.message : "Could not start Google sign-in.")
    }
  }

  async function disconnect() {
    setBusy(true)
    setHint(null)
    try {
      await fetch("/api/google", { method: "DELETE" })
      load()
    } finally {
      setBusy(false)
    }
  }

  async function onServiceAccount(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setHint(null)
    try {
      const parsed = JSON.parse(await file.text()) as unknown
      const response = await fetch("/api/google/service-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      })
      const data = (await response.json()) as GoogleStatus & { email?: string }
      if (!response.ok) throw new Error(data.error || "Could not save the key.")
      setStatus(data)
      setHint(
        data.calendarWritable
          ? `Service account ${data.email} saved and can write to ${data.calendars?.[0]?.summary || "a shared calendar"}. Say “remind me in 10 minutes to drink water”.`
          : `Service account ${data.email} saved. The key is not enough — share your Google Calendar with that email as “Make changes to events”. It still cannot open personal Gmail.`
      )
    } catch (caught) {
      setHint(caught instanceof Error ? caught.message : "Bad JSON key.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/8">
      <p className="flex items-center gap-2 text-sm font-medium">
        <GoogleMark className="size-4" />
        Google apps
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        A service account cannot open personal Gmail. It can use Calendar,
        Drive, Docs, and Sheets only after you share those with the robot
        email. Connect Google (OAuth) for Gmail, Contacts, and your own
        calendar without sharing. Keep, Meet, and Photos Library are not
        these APIs.
      </p>
      <p className="mt-2 text-sm">{status?.note || "Checking…"}</p>
      {status?.redirectUri ? (
        <p className="mt-2 break-all text-xs text-muted-foreground">
          Authorized redirect URI to paste in Google Cloud: {status.redirectUri}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <AppChip live={Boolean(status?.canGmail)} label="Gmail">
          <GmailMark className="size-5" />
        </AppChip>
        <AppChip
          live={Boolean(status?.calendarWritable || (status?.canCalendar && status?.connected))}
          label="Calendar"
        >
          <GoogleCalendarMark className="size-5" />
        </AppChip>
        <AppChip live={Boolean(status?.canDrive)} label="Drive">
          <GoogleDriveMark className="size-5" />
        </AppChip>
        <AppChip live={Boolean(status?.canDrive)} label="Docs">
          <GoogleDocsMark className="size-5" />
        </AppChip>
        <AppChip live={Boolean(status?.canDrive)} label="Sheets">
          <GoogleSheetsMark className="size-5" />
        </AppChip>
        <AppChip live={Boolean(status?.canTasks)} label="Tasks">
          <GoogleTasksMark className="size-5" />
        </AppChip>
        <AppChip live={Boolean(status?.canContacts)} label="Contacts">
          <GoogleContactsMark className="size-5" />
        </AppChip>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <Field label="OAuth client ID">
          <Input
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            placeholder="….apps.googleusercontent.com"
            autoComplete="off"
          />
        </Field>
        <Field label="OAuth client secret">
          <Input
            type="password"
            value={clientSecret}
            onChange={(event) => setClientSecret(event.target.value)}
            placeholder="Stored only in data/ on this machine"
            autoComplete="off"
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || !clientId.trim() || !clientSecret.trim()}
            onClick={() => void saveClient()}
          >
            Save client
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void connect()}
            title={status?.connected ? "Reconnect Google" : "Connect Google"}
            aria-label={status?.connected ? "Reconnect Google" : "Connect Google"}
          >
            <GoogleMark />
            <span className="sr-only">
              {status?.connected ? "Reconnect Google" : "Connect Google"}
            </span>
          </Button>
          {status?.connected ? (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void disconnect()}>
              Disconnect
            </Button>
          ) : null}
        </div>
      </div>

      <label className="mt-3 block text-sm">
        <span className="text-muted-foreground">Service account JSON (optional)</span>
        <Input
          type="file"
          accept="application/json,.json"
          className="mt-1"
          onChange={(event) => void onServiceAccount(event.target.files?.[0])}
        />
      </label>
      {status?.serviceAccount ? (
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="break-all text-xs text-muted-foreground">{status.serviceAccount}</p>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => {
                void fetch("/api/google/service-account", { method: "DELETE" }).then(load)
              }}
            >
              Remove key
            </Button>
          </div>
          {status.calendarWritable ? (
            <p className="text-xs text-muted-foreground">
              {status.shareHint || "Calendar share looks writable. Reminders can land there."}
            </p>
          ) : (
            <div className="rounded-lg bg-muted/60 p-2 text-xs leading-relaxed">
              <p className="font-medium text-foreground">
                Key is loaded. Calendar is not shared yet.
              </p>
              <ol className="mt-1 list-decimal space-y-1 pl-4 text-muted-foreground">
                <li>Open Google Calendar as you.</li>
                <li>Settings (gear) → Settings → your calendar → Share with specific people.</li>
                <li>
                  Add{" "}
                  <code className="break-all text-foreground">{status.serviceAccount}</code>
                </li>
                <li>Permission: Make changes to events — not “See all event details”.</li>
                <li>Then say: remind me in 10 minutes to drink water.</li>
              </ol>
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <Label htmlFor="allow-google-write" className="text-sm">
            Always allow Google writes
          </Label>
          <p className="text-xs text-muted-foreground">
            Off = she asks before sending mail or creating events.
          </p>
        </div>
        <Switch
          id="allow-google-write"
          checked={allowWrite}
          onCheckedChange={onAllowWrite}
        />
      </div>
      {hint ? <p className="mt-2 text-sm text-foreground">{hint}</p> : null}
    </div>
  )
}

function AppChip({
  live,
  label,
  children,
}: {
  live: boolean
  label: string
  children: ReactNode
}) {
  return (
    <span
      title={`${label} ${live ? "live" : "off"}`}
      aria-label={`${label} ${live ? "live" : "off"}`}
      className={`inline-flex size-9 items-center justify-center rounded-lg ring-1 ${
        live
          ? "bg-card ring-primary/40"
          : "bg-muted/40 opacity-50 ring-foreground/10"
      }`}
    >
      {children}
    </span>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
