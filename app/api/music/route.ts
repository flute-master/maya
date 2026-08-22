import { findSong } from "@/lib/music"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim()
  if (!query) {
    return Response.json({ ok: true, player: true })
  }
  const track = await findSong(query)
  return Response.json({ ok: true, track })
}

export async function POST(request: Request) {
  let body: { query?: string }
  try {
    body = (await request.json()) as { query?: string }
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 })
  }
  const query = String(body.query ?? "").trim()
  if (!query) {
    return Response.json({ error: "Name a song." }, { status: 400 })
  }
  const track = await findSong(query)
  return Response.json({ ok: true, track })
}
