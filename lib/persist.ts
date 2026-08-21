import {
  hasStoredVault,
  loadVault,
  normalizeVault,
  saveVault,
} from "@/lib/vault"
import type { MemoryVault } from "@/lib/types"

export async function readDeviceMemory(): Promise<MemoryVault | null> {
  try {
    const response = await fetch("/api/memory", { cache: "no-store" })
    if (!response.ok) return null
    const data = (await response.json()) as { vault?: unknown }
    return normalizeVault(data.vault)
  } catch {
    return null
  }
}

export async function writeDeviceMemory(vault: MemoryVault): Promise<boolean> {
  try {
    const response = await fetch("/api/memory", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vault),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function hydrateVault(): Promise<MemoryVault> {
  const local = loadVault()
  const disk = await readDeviceMemory()
  if (!hasStoredVault() && disk) {
    saveVault(disk)
    return disk
  }
  return local
}
