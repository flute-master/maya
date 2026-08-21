import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const DIM = 72
const STORE = join(process.cwd(), "data", "maya-vectors.json")

export type VectorDoc = {
  id: string
  kind: "note" | "chat" | "file"
  text: string
  vector: number[]
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#/.]+/)
    .filter((word) => word.length > 2)
}

export function embed(text: string): number[] {
  const vec = new Array<number>(DIM).fill(0)
  for (const tok of tokenize(text)) {
    let h = 2166136261
    for (let i = 0; i < tok.length; i += 1) {
      h ^= tok.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    const idx = Math.abs(h) % DIM
    vec[idx] += (h & 1) === 0 ? 1 : -1
  }
  let norm = 0
  for (const n of vec) norm += n * n
  const mag = Math.sqrt(norm) || 1
  return vec.map((n) => n / mag)
}

function cosine(a: number[], b: number[]) {
  let s = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i += 1) s += (a[i] ?? 0) * (b[i] ?? 0)
  return s
}

export async function indexDocuments(docs: Omit<VectorDoc, "vector">[]) {
  const payload = {
    updatedAt: Date.now(),
    docs: docs
      .filter((doc) => doc.text.trim().length > 8)
      .slice(0, 400)
      .map((doc) => ({ ...doc, vector: embed(doc.text) })),
  }
  await mkdir(join(process.cwd(), "data"), { recursive: true })
  await writeFile(STORE, JSON.stringify(payload), "utf8")
  return payload.docs.length
}

export async function retrieve(query: string, limit = 5): Promise<string[]> {
  let docs: VectorDoc[] = []
  try {
    const raw = JSON.parse(await readFile(STORE, "utf8")) as { docs?: VectorDoc[] }
    docs = raw.docs ?? []
  } catch {
    return []
  }
  if (!docs.length) return []
  const q = embed(query)
  return docs
    .map((doc) => ({ text: doc.text, score: cosine(q, doc.vector) }))
    .filter((item) => item.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.text.replace(/\s+/g, " ").trim().slice(0, 280))
}
