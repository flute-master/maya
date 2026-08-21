import { SAGE_LAYERS } from "@/lib/sage/layers"

export function SageLayers({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {!compact ? (
        <p className="text-sm text-muted-foreground">
          The interesting part is the body around an existing model — not
          training Llama from zero. What is live on this laptop:
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {SAGE_LAYERS.map((layer) => (
          <li
            key={layer.ability}
            className="rounded-lg bg-muted/50 px-3 py-2 text-left"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{layer.ability}</span>
              <span
                className={`text-[11px] ${
                  layer.status === "live"
                    ? "text-primary"
                    : layer.status === "partial"
                      ? "text-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {layer.status === "live"
                  ? "Live"
                  : layer.status === "partial"
                    ? "Partial"
                    : "Not this app"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{layer.how}</p>
            {compact ? null : (
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {layer.note}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
