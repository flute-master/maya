import {
  authUrl,
  googleStatus,
  readOAuthClient,
  redirectUriFromRequest,
  startOAuthState,
} from "@/lib/google/auth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const client = await readOAuthClient()
  if (!client) {
    return Response.json(
      {
        error:
          "Paste a Google OAuth client ID and secret in Customize → Lookup first. A service account cannot replace that for Gmail.",
      },
      { status: 400 }
    )
  }
  const redirectUri = redirectUriFromRequest(request)
  const state = await startOAuthState()
  const url = authUrl({ clientId: client.clientId, redirectUri, state })
  const wantJson = request.headers.get("accept")?.includes("application/json")
  if (wantJson || new URL(request.url).searchParams.get("json") === "1") {
    return Response.json({ url, redirectUri, ...(await googleStatus()) })
  }
  return Response.redirect(url, 302)
}
