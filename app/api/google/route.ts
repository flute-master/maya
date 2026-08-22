import { calendarWriteState } from "@/lib/google/apps"
import {
  clearOAuthToken,
  googleStatus,
  saveOAuthClient,
  redirectUriFromRequest,
} from "@/lib/google/auth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const [status, calendar] = await Promise.all([
    googleStatus(),
    calendarWriteState(),
  ])
  return Response.json({
    ...status,
    ...calendar,
    redirectUri: redirectUriFromRequest(request),
  })
}

export async function POST(request: Request) {
  let body: { clientId?: string; clientSecret?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 })
  }
  const clientId = body.clientId?.trim()
  const clientSecret = body.clientSecret?.trim()
  if (!clientId || !clientSecret) {
    return Response.json(
      { error: "Need both the OAuth client ID and secret from Google Cloud." },
      { status: 400 }
    )
  }
  await saveOAuthClient({ clientId, clientSecret })
  const status = await googleStatus()
  return Response.json({
    ok: true,
    ...status,
    redirectUri: redirectUriFromRequest(request),
  })
}

export async function DELETE() {
  await clearOAuthToken()
  return Response.json({ ok: true, ...(await googleStatus()) })
}
