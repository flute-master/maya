import { readdir, readFile, stat } from "node:fs/promises"
import { join, relative } from "node:path"

import { listWorkspace, readWorkspaceFile } from "@/lib/sage/files"

export const KNOWLEDGE_DIR = join(process.cwd(), "data", "knowledge")

export type KnowledgeHit = {
  path: string
  snippet: string
  source: "knowledge" | "workspace"
}

function score(text: string, words: string[]) {
  const lower = text.toLowerCase()
  return words.reduce((sum, word) => sum + (lower.includes(word) ? 1 : 0), 0)
}

async function walkTextFiles(root: string, max = 40): Promise<string[]> {
  const found: string[] = []
  async function walk(dir: string) {
    if (found.length >= max) return
    let names: string[] = []
    try {
      names = await readdir(dir)
    } catch {
      return
    }
    for (const name of names) {
      if (name.startsWith(".")) continue
      const full = join(dir, name)
      const info = await stat(full).catch(() => null)
      if (!info) continue
      if (info.isDirectory()) {
        await walk(full)
        continue
      }
      if (/\.(md|txt|json|csv|ts|js|py|nf)$/i.test(name) && info.size < 400_000) {
        found.push(full)
      }
    }
  }
  await walk(root)
  return found
}

export async function searchKnowledge(query: string, limit = 6): Promise<KnowledgeHit[]> {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2)
    .slice(0, 8)
  if (!words.length) return []

  const hits: Array<KnowledgeHit & { score: number }> = []
  const files = await walkTextFiles(KNOWLEDGE_DIR)
  for (const file of files) {
    const text = await readFile(file, "utf8").catch(() => "")
    const n = score(text, words)
    if (n < 1) continue
    const idx = text.toLowerCase().indexOf(words[0])
    const start = Math.max(0, idx - 80)
    hits.push({
      path: relative(KNOWLEDGE_DIR, file) || file,
      snippet: text.slice(start, start + 220).replace(/\s+/g, " ").trim(),
      source: "knowledge",
      score: n,
    })
  }

  const workspace = await listWorkspace().catch(() => [])
  for (const row of workspace.filter((item) => item.kind === "data").slice(0, 20)) {
    const file = await readWorkspaceFile(row.name).catch(() => null)
    if (!file || file.binary) continue
    const n = score(file.text, words)
    if (n < 1) continue
    hits.push({
      path: row.name,
      snippet: file.text.slice(0, 220).replace(/\s+/g, " ").trim(),
      source: "workspace",
      score: n,
    })
  }

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _score, ...hit }) => hit)
}
