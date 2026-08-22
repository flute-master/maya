#!/usr/bin/env node
import { mkdir, stat } from "node:fs/promises"
import { spawn } from "node:child_process"
import { join } from "node:path"

const root = process.cwd()
const stamp = new Date().toISOString().slice(0, 10)
const destDir = join(root, "data", "backups")
const dest = join(destDir, `maya-backup-${stamp}.tgz`)

await mkdir(destDir, { recursive: true })

const include = []
for (const rel of ["data/maya.db", "data/knowledge", "data/maya-memory.json"]) {
  try {
    await stat(join(root, rel))
    include.push(rel)
  } catch {
    /* skip missing */
  }
}

if (!include.length) {
  console.error("Nothing to back up yet.")
  process.exit(1)
}

await new Promise((resolve, reject) => {
  const child = spawn("tar", ["-czf", dest, ...include], { cwd: root, stdio: "inherit" })
  child.on("error", reject)
  child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`tar exited ${code}`))))
})

console.log(`Wrote ${dest}`)
console.log("OAuth secrets and private keys were not included.")
