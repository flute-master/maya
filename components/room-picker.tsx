"use client"

import { ATMOSPHERES, type AtmosphereId } from "@/lib/atmosphere"

export function RoomPicker({
  value,
  onPick,
  compact = false,
}: {
  value: AtmosphereId
  onPick: (id: AtmosphereId) => void
  compact?: boolean
}) {
  return (
    <div className={compact ? "flex flex-wrap justify-center gap-2" : "flex flex-col gap-2"}>
      {ATMOSPHERES.map((skin) => {
        const selected = (value ?? "hearth") === skin.id
        return (
          <button
            key={skin.id}
            type="button"
            onClick={() => onPick(skin.id)}
            aria-pressed={selected}
            title={skin.label}
            aria-label={skin.label}
            className={
              compact
                ? `rounded-full border p-1.5 transition-colors ${
                    selected
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`
                : `rounded-xl border px-3 py-2 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`
            }
          >
            <span className="inline-flex items-center gap-2">
              <span
                className={
                  compact
                    ? "size-5 shrink-0 rounded-full ring-1 ring-foreground/20"
                    : "size-2.5 shrink-0 rounded-full ring-1 ring-foreground/20"
                }
                style={{ background: skin.swatch }}
                aria-hidden
              />
              <span className={compact ? "sr-only" : "text-sm font-medium text-foreground"}>
                {skin.label}
              </span>
              {!compact && selected ? (
                <span className="text-[11px] font-medium text-primary">Using</span>
              ) : null}
            </span>
            {compact ? null : (
              <span className="mt-1 block text-[11px]">{skin.promise}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
