import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import { basename, join, relative, resolve, sep } from "node:path"

export const WORKSPACE = join(process.cwd(), "data", "workspace")
const MAX_BYTES = 2_000_000

function assertInside(path: string) {
  const root = resolve(WORKSPACE)
  const full = resolve(path)
  const rel = relative(root, full)
  if (rel.startsWith("..") || rel.includes(`..${sep}`)) {
    throw new Error("That path is outside Maya's workspace.")
  }
  return full
}

export function safeFileName(name: string) {
  const base = basename(name).replace(/[^\w.\- ()[\]]+/g, "_")
  if (!base || base === "." || base === "..") return "untitled.txt"
  return base.slice(0, 80)
}

export async function ensureWorkspace() {
  await mkdir(WORKSPACE, { recursive: true })
}

export async function listWorkspace() {
  await ensureWorkspace()
  const names = await readdir(WORKSPACE)
  const rows: Array<{ name: string; bytes: number; kind: string }> = []
  for (const name of names) {
    if (name.startsWith(".")) continue
    const full = assertInside(join(WORKSPACE, name))
    const info = await stat(full)
    if (!info.isFile()) continue
    rows.push({
      name,
      bytes: info.size,
      kind: name.toLowerCase().match(/\.(png|jpe?g|gif|webp)$/)
        ? "image"
        : name.toLowerCase().match(/\.(csv|tsv|json|txt|md|py)$/)
          ? "data"
          : "file",
    })
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export async function readWorkspaceFile(name: string) {
  const full = assertInside(join(WORKSPACE, safeFileName(name)))
  const info = await stat(full)
  if (info.size > MAX_BYTES) {
    throw new Error("File is larger than 2 MB.")
  }
  const lower = name.toLowerCase()
  if (/\.(png|jpe?g|gif|webp|pdf|zip)$/.test(lower)) {
    return {
      name: safeFileName(name),
      binary: true,
      bytes: info.size,
      text: `(binary ${safeFileName(name)}, ${info.size} bytes — describe what you need, or run Python on it)`,
    }
  }
  const text = await readFile(full, "utf8")
  return { name: safeFileName(name), binary: false, bytes: info.size, text }
}

export async function writeWorkspaceFile(name: string, contents: Buffer | string) {
  await ensureWorkspace()
  const full = assertInside(join(WORKSPACE, safeFileName(name)))
  const buf = typeof contents === "string" ? Buffer.from(contents, "utf8") : contents
  if (buf.length > MAX_BYTES) throw new Error("File is larger than 2 MB.")
  await writeFile(full, buf)
  return { name: safeFileName(name), bytes: buf.length }
}

export async function textFilesForIndex() {
  const listed = await listWorkspace()
  const docs: Array<{ id: string; kind: "file"; text: string }> = []
  for (const row of listed) {
    if (row.kind === "image") {
      docs.push({
        id: `file:${row.name}`,
        kind: "file",
        text: `file ${row.name} image ${row.bytes} bytes`,
      })
      continue
    }
    try {
      const file = await readWorkspaceFile(row.name)
      docs.push({
        id: `file:${row.name}`,
        kind: "file",
        text: `file ${row.name}: ${file.text.slice(0, 1200)}`,
      })
    } catch {
      /* skip unreadable */
    }
  }
  return docs
}
