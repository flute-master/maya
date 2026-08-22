"use client"

import { useState } from "react"

import { Calculator } from "lucide-react"

import { evaluateCalc } from "@/lib/calc"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

const KEYS = [
  ["C", "⌫", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", ".", "^", "="],
] as const

export function CalcSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [expr, setExpr] = useState("")
  const [shown, setShown] = useState("0")
  const [error, setError] = useState<string | null>(null)

  function apply(key: string) {
    setError(null)
    if (key === "C") {
      setExpr("")
      setShown("0")
      return
    }
    if (key === "⌫") {
      const next = expr.slice(0, -1)
      setExpr(next)
      setShown(next || "0")
      return
    }
    if (key === "=") {
      const result = evaluateCalc(expr || shown)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setExpr(result.text)
      setShown(result.text)
      return
    }
    const mapped =
      key === "÷" ? "/" : key === "×" ? "*" : key === "−" ? "-" : key
    const next = `${expr}${mapped}`
    setExpr(next)
    setShown(next)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full gap-0 sm:max-w-sm" showCloseButton>
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Calculator className="size-5" />
            Calculator
          </SheetTitle>
          <SheetDescription>
            Local, instant, no Python confirm. You can also type “calculate 15% of
            240” in chat.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 p-4">
          <div className="rounded-2xl bg-card px-4 py-5 text-right ring-1 ring-foreground/10">
            <p className="font-heading break-all text-3xl font-medium tracking-tight">
              {shown}
            </p>
            {error ? (
              <p className="mt-2 text-left text-xs text-destructive">{error}</p>
            ) : (
              <p className="mt-2 text-left text-xs text-muted-foreground">
                % of works in chat: 15% of 80. Here, % is percent of the current
                value.
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {KEYS.flat().map((key) => (
              <Button
                key={key}
                type="button"
                variant={key === "=" ? "default" : "outline"}
                className="h-12 rounded-xl text-base"
                onClick={() => apply(key)}
              >
                {key}
              </Button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
