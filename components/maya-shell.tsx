"use client"

import dynamic from "next/dynamic"

const MayaApp = dynamic(
  () =>
    import("@/components/maya-app").then((mod) => ({ default: mod.MayaApp })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border/80 px-4 py-3">
          <h1 className="font-heading text-lg font-medium tracking-tight">
            Maya
          </h1>
        </div>
        <p className="m-auto px-4 text-sm text-muted-foreground">
          Opening the composer…
        </p>
      </div>
    ),
  }
)

export function MayaShell() {
  return <MayaApp />
}
