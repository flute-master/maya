"use client"

import { useEffect, useState } from "react"

type Snapshot = {
  brain?: { model?: string; ollama?: boolean; note?: string }
  memory?: { facts?: number }
  tasks?: { active?: number }
  plans?: { open?: number }
  skills?: { total?: number; offline?: number; names?: string[] }
  permissions?: Array<{ id: string; label: string; mode: string; offline: boolean }>
  audit?: Array<{ at: string; tool: string | null; event: string; allowed: number | null }>
}

type Doctor = {
  checks: Array<{ name: string; ok: boolean; warn?: boolean; detail: string }>
  healthy: number
  warning: number
  error: number
}

export function SystemPanel() {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/core")
      .then(async (response) => {
        const data = (await response.json()) as Snapshot & { error?: string }
        if (!response.ok) throw new Error(data.error || "Core unavailable")
        if (!cancelled) setSnap(data)
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Core unavailable")
        }
      })
    fetch("/api/core?view=doctor")
      .then(async (response) => {
        const data = (await response.json()) as { doctor?: Doctor }
        if (!cancelled && data.doctor) setDoctor(data.doctor)
      })
      .catch(() => {
        /* doctor is optional */
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }
  if (!snap) {
    return <p className="text-sm text-muted-foreground">Reading local core…</p>
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/8">
        <p className="font-medium">Maya system</p>
        <p className="mt-2 text-muted-foreground">
          Brain {snap.brain?.model || "built-in"}
          {snap.brain?.ollama ? " · Ollama" : " · offline engine"}
        </p>
        <p className="mt-1 text-muted-foreground">
          Memory {snap.memory?.facts ?? 0} facts · {snap.skills?.total ?? 0} skills ·{" "}
          {snap.tasks?.active ?? 0} tasks
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{snap.brain?.note}</p>
      </div>

      {doctor ? (
        <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/8">
          <p className="font-medium">Doctor</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {doctor.healthy} healthy · {doctor.warning} warning · {doctor.error} error
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-xs">
            {doctor.checks.map((check) => (
              <li key={check.name}>
                {check.ok ? (check.warn ? "⚠" : "✓") : "✗"} {check.name} — {check.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/8">
        <p className="font-medium">Permissions</p>
        <ul className="mt-2 flex flex-col gap-1 text-xs">
          {(snap.permissions ?? []).slice(0, 16).map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>{item.label}</span>
              <span className="text-muted-foreground">
                {item.mode}
                {item.offline ? " · offline" : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {snap.audit?.length ? (
        <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/8">
          <p className="font-medium">Recent access</p>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
            {snap.audit.slice(0, 8).map((row, i) => (
              <li key={`${row.at}-${i}`}>
                {row.at.slice(11, 16)} {row.tool || row.event}
                {row.allowed === 0 ? " · denied" : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
