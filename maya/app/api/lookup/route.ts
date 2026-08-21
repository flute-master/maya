import { lookupWeb } from "@/lib/lookup"
import type { PublicIdentity } from "@/lib/identity"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let body: {
    text?: string
    force?: boolean
    hometown?: string
    identity?: PublicIdentity
  }
  try {
    body = (await request.json()) as {
      text?: string
      force?: boolean
      hometown?: string
      identity?: PublicIdentity
    }
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 })
  }
  const text = String(body.text ?? "").trim()
  if (!text) return Response.json({ hits: [], searched: false })
  const lookup = await lookupWeb(
    text,
    Boolean(body.force),
    String(body.hometown ?? "").trim() || undefined,
    body.identity && typeof body.identity === "object" ? body.identity : {}
  )
  return Response.json(lookup)
}
