import { existsSync, readdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { SERVICE_ACCOUNT_FILE } from "@/lib/google/config"

export const DESKTOP_KEY_NAME = "maya-google-service-account.json"

const SKIP_WINDOWS_USERS = new Set([
  "Public",
  "Default",
  "Default User",
  "All Users",
  "WDAGUtilityAccount",
])

export function linuxDesktopKeyPath() {
  return join(homedir(), "Desktop", DESKTOP_KEY_NAME)
}

export function windowsDesktopKeyPaths() {
  const usersDir = "/mnt/c/Users"
  if (!existsSync(usersDir)) return [] as string[]
  let names: string[] = []
  try {
    names = readdirSync(usersDir).filter(
      (name) => !SKIP_WINDOWS_USERS.has(name) && !name.startsWith(".")
    )
  } catch {
    return []
  }
  const preferred =
    process.env.WINDOWS_USERNAME?.trim() || process.env.USER?.trim() || ""
  const chosen =
    preferred && names.includes(preferred)
      ? [preferred]
      : names
  const paths: string[] = []
  for (const name of chosen) {
    paths.push(join(usersDir, name, "Desktop", DESKTOP_KEY_NAME))
    paths.push(join(usersDir, name, "OneDrive", "Desktop", DESKTOP_KEY_NAME))
  }
  return paths
}

export function desktopKeyPaths() {
  return [linuxDesktopKeyPath(), ...windowsDesktopKeyPaths()]
}

export function serviceAccountCandidatePaths() {
  const extra = process.env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim()
  return [
    extra,
    SERVICE_ACCOUNT_FILE,
    ...desktopKeyPaths(),
    join(homedir(), DESKTOP_KEY_NAME),
  ].filter((path): path is string => Boolean(path))
}
