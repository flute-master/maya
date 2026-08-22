#!/usr/bin/env node
import { access } from "node:fs/promises"
import { spawn } from "node:child_process"
import { resolve } from "node:path"

const archive = process.argv[2]
if (!archive) {
  console.error("Usage: npm run restore -- data/backups/maya-backup-YYYY-MM-DD.tgz")
  process.exit(1)
}
const full = resolve(archive)
await access(full)
await new Promise((resolveOk, reject) => {
  const child = spawn("tar", ["-xzf", full], { cwd: process.cwd(), stdio: "inherit" })
  child.on("error", reject)
  child.on("close", (code) => (code === 0 ? resolveOk() : reject(new Error(`tar exited ${code}`))))
})
console.log("Restored vault / db / knowledge. Google keys were not in the archive.")
