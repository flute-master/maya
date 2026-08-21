"use client"

/** Tiny WebGPU check — do not import web-llm from here. */

export function canRunOnDevice() {
  if (typeof navigator === "undefined") return false
  return Boolean((navigator as Navigator & { gpu?: unknown }).gpu)
}
