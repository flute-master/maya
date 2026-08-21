import { finishOAuth, redirectUriFromRequest, takeOAuthState } from "@/lib/google/auth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = `${url.protocol}//${url.host}`
  const error = url.searchParams.get("error")
  if (error) {
    return Response.redirect(`${origin}/?google=denied`, 302)
  }
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  if (!code || !state) {
    return Response.redirect(`${origin}/?google=missing`, 302)
  }
  const ok = await takeOAuthState(state)
  if (!ok) {
    return Response.redirect(`${origin}/?google=state`, 302)
  }
  try {
    await finishOAuth({
      code,
      redirectUri: redirectUriFromRequest(request),
    })
    return Response.redirect(`${origin}/?google=connected`, 302)
  } catch {
    return Response.redirect(`${origin}/?google=token`, 302)
  }
}
