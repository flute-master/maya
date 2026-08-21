import { writeWorkspaceFile } from "@/lib/sage/files"

export const runtime = "nodejs"

const MAX_JSON = 2_500_000

export async function GET() {
  const { listWorkspace } = await import("@/lib/sage/files")
  try {
    const files = await listWorkspace()
    return Response.json({ ok: true, files })
  } catch (caught) {
    return Response.json(
      { error: caught instanceof Error ? caught.message : "Could not list files." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  let body: {
    name?: string
    text?: string
    base64?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 })
  }
  const name = body.name?.trim()
  if (!name) return Response.json({ error: "Missing file name." }, { status: 400 })
  try {
    let payload: Buffer | string
    if (body.base64) {
      if (body.base64.length > MAX_JSON) {
        return Response.json({ error: "File is too large." }, { status: 413 })
      }
      payload = Buffer.from(body.base64, "base64")
    } else if (typeof body.text === "string") {
      payload = body.text
    } else {
      return Response.json({ error: "Missing text or base64." }, { status: 400 })
    }
    const saved = await writeWorkspaceFile(name, payload)
    return Response.json({ ok: true, ...saved })
  } catch (caught) {
    return Response.json(
      { error: caught instanceof Error ? caught.message : "Could not save file." },
      { status: 400 }
    )
  }
}
