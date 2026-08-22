import { createCalendarEvent } from "@/lib/google/apps"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let body: { title?: string; when?: string | number }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 })
  }

  const title = body.title?.trim() || "Reminder"
  const when = body.when
  if (when === undefined || when === "") {
    return Response.json(
      { ok: false, summary: "I need a time for that reminder." },
      { status: 400 }
    )
  }

  const result = await createCalendarEvent({ title, when })
  return Response.json(result, { status: result.ok ? 200 : 200 })
}
