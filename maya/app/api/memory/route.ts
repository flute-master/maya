import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

import { normalizeVault, toExport } from "@/lib/vault"

export const runtime = "nodejs"

const MEMORY_FILE = join(process.cwd(), "data", "maya-memory.json")

export async function GET() {
  try {
    const raw = await readFile(MEMORY_FILE, "utf8")
    const vault = normalizeVault(JSON.parse(raw) as unknown)
    if (!vault) {
      return Response.json({ error: "Memory file is unreadable." }, { status: 422 })
    }
    return Response.json({
      ok: true,
      path: "data/maya-memory.json",
      vault,
    })
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === "ENOENT") {
      return Response.json({ ok: true, path: "data/maya-memory.json", vault: null })
    }
    return Response.json({ error: "Could not read memory." }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 })
  }

  const vault = normalizeVault(body)
  if (!vault) {
    return Response.json({ error: "That is not a Maya memory pack." }, { status: 400 })
  }

  const payload = JSON.stringify(toExport(vault), null, 2)
  if (payload.length > 6_000_000) {
    return Response.json({ error: "Memory is too large to save." }, { status: 413 })
  }

  await mkdir(dirname(MEMORY_FILE), { recursive: true })
  await writeFile(MEMORY_FILE, payload, "utf8")
  return Response.json({
    ok: true,
    path: "data/maya-memory.json",
    savedAt: Date.now(),
  })
}
