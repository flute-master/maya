import { calendarWriteState } from "@/lib/google/apps"
import {
  clearServiceAccount,
  googleStatus,
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

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Expected the service account JSON." }, { status: 400 })
  }
  try {
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
