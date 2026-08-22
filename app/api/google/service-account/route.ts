import { calendarWriteState } from "@/lib/google/apps"
import {
  clearServiceAccount,
  googleStatus,
  placeServiceAccountOnDesktop,
  readServiceAccount,
  saveServiceAccount,
} from "@/lib/google/auth"

export const runtime = "nodejs"

async function statusWithCalendar() {
  const [status, calendar] = await Promise.all([
    googleStatus(),
    calendarWriteState(),
  ])
  return { ...status, ...calendar }
}

export async function GET(request: Request) {
  const download = new URL(request.url).searchParams.get("download")
  if (download !== "1") {
    return Response.json(await statusWithCalendar())
  }
  const key = await readServiceAccount()
  if (!key) {
    return Response.json({ error: "No service-account key is loaded." }, { status: 404 })
  }
  return new Response(JSON.stringify(key, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition":
        'attachment; filename="maya-google-service-account.json"',
      "Cache-Control": "no-store",
    },
  })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Expected the service account JSON." }, { status: 400 })
  }
  try {
    if (body && typeof body === "object" && "placeOnDesktop" in body) {
      const placed = await placeServiceAccountOnDesktop()
      return Response.json({ ok: true, ...(await statusWithCalendar()), ...placed })
    }
    const email = await saveServiceAccount(body)
    return Response.json({ ok: true, ...(await statusWithCalendar()), email })
  } catch (caught) {
    return Response.json(
      {
        error:
          caught instanceof Error
            ? caught.message
            : "Could not save that service account.",
      },
      { status: 400 }
    )
  }
}

export async function DELETE() {
  await clearServiceAccount()
  return Response.json({ ok: true, ...(await statusWithCalendar()) })
}
