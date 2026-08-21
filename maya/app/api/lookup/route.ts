import { lookupWeb } from "@/lib/lookup"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let body: { text?: string; force?: boolean }
  try {
    body = (await request.json()) as { text?: string; force?: boolean }
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 })
  }
  const text = String(body.text ?? "").trim()
  if (!text) return Response.json({ hits: [], searched: false })
  const lookup = await lookupWeb(text, Boolean(body.force))
  return Response.json(lookup)
}
