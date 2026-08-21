"use client"

import dynamic from "next/dynamic"

const MayaApp = dynamic(
  () => import("@/components/maya-app").then((mod) => mod.MayaApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Lighting the lamp…
      </div>
    ),
  }
)

export function MayaShell() {
  return <MayaApp />
}
