import { createSign } from "node:crypto"
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"

import {
  GOOGLE_DIR,
  GOOGLE_SCOPES,
  OAUTH_CLIENT_FILE,
  OAUTH_STATE_FILE,
  OAUTH_TOKEN_FILE,
  SA_SCOPES,
  SERVICE_ACCOUNT_FILE,
  type OAuthClient,
  type OAuthToken,
  type ServiceAccountKey,
} from "@/lib/google/config"

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T
  } catch {
    return null
  }
}

async function writeJson(path: string, value: unknown) {
  await mkdir(GOOGLE_DIR, { recursive: true })
  await writeFile(path, JSON.stringify(value, null, 2), "utf8")
}

export async function readOAuthClient(): Promise<OAuthClient | null> {
  const envId = process.env.GOOGLE_CLIENT_ID?.trim()
  const envSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  if (envId && envSecret) return { clientId: envId, clientSecret: envSecret }
  const stored = await readJson<OAuthClient>(OAUTH_CLIENT_FILE)
  if (stored?.clientId && stored.clientSecret) return stored
  return null
}

export async function saveOAuthClient(client: OAuthClient) {
  await writeJson(OAUTH_CLIENT_FILE, {
    clientId: client.clientId.trim(),
    clientSecret: client.clientSecret.trim(),
  })
}

export async function readOAuthToken() {
  return readJson<OAuthToken>(OAUTH_TOKEN_FILE)
}

export async function saveOAuthToken(token: OAuthToken) {
  await writeJson(OAUTH_TOKEN_FILE, token)
}

export async function clearOAuthToken() {
  await unlink(OAUTH_TOKEN_FILE).catch(() => undefined)
  await unlink(OAUTH_STATE_FILE).catch(() => undefined)
}

export async function readServiceAccount() {
  const key = await readJson<ServiceAccountKey>(SERVICE_ACCOUNT_FILE)
  if (!key?.client_email || !key.private_key) return null
  return key
}

export async function saveServiceAccount(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    throw new Error("That is not a Google service-account JSON key.")
  }
  const key = raw as ServiceAccountKey
  if (!key.client_email || !key.private_key) {
    throw new Error("The key needs client_email and private_key.")
  }
  if (key.type && key.type !== "service_account") {
    throw new Error("Upload a service account key, not an OAuth client file.")
  }
  await writeJson(SERVICE_ACCOUNT_FILE, key)
  return key.client_email
}

export async function clearServiceAccount() {
  await unlink(SERVICE_ACCOUNT_FILE).catch(() => undefined)
}

export function redirectUriFromRequest(request: Request) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "127.0.0.1:43217"
  const proto = request.headers.get("x-forwarded-proto") || "http"
  return `${proto}://${host}/api/google/callback`
}

export async function startOAuthState() {
  const state = `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
  await writeJson(OAUTH_STATE_FILE, { state, at: Date.now() })
  return state
}

export async function takeOAuthState(incoming: string) {
  const stored = await readJson<{ state?: string; at?: number }>(OAUTH_STATE_FILE)
  await unlink(OAUTH_STATE_FILE).catch(() => undefined)
  if (!stored?.state || stored.state !== incoming) return false
  if (stored.at && Date.now() - stored.at > 15 * 60_000) return false
  return true
}

export function authUrl(input: {
  clientId: string
  redirectUri: string
  state: string
}) {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: GOOGLE_SCOPES.join(" "),
    state: input.state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

async function exchangeToken(body: URLSearchParams) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  const data = (await response.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    scope?: string
    error?: string
    error_description?: string
  }
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Google token exchange failed.")
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    scope: data.scope,
  }
}

async function fetchEmail(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return undefined
  const data = (await response.json()) as { email?: string }
  return data.email
}

export async function finishOAuth(input: {
  code: string
  redirectUri: string
}) {
  const client = await readOAuthClient()
  if (!client) throw new Error("Save a Google OAuth client ID first.")
  const data = await exchangeToken(
    new URLSearchParams({
      code: input.code,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    })
  )
  const existing = await readOAuthToken()
  const email = await fetchEmail(data.access_token)
  const token: OAuthToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || existing?.refreshToken,
    expiry: Date.now() + Math.max(60, data.expires_in ?? 3600) * 1000,
    email: email || existing?.email,
    scopes: data.scope?.split(/\s+/) ?? GOOGLE_SCOPES,
  }
  await saveOAuthToken(token)
  return token
}

async function refreshOAuth(token: OAuthToken) {
  const client = await readOAuthClient()
  if (!client || !token.refreshToken) return null
  const data = await exchangeToken(
    new URLSearchParams({
      client_id: client.clientId,
      client_secret: client.clientSecret,
      refresh_token: token.refreshToken,
      grant_type: "refresh_token",
    })
  )
  const next: OAuthToken = {
    ...token,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || token.refreshToken,
    expiry: Date.now() + Math.max(60, data.expires_in ?? 3600) * 1000,
    scopes: data.scope?.split(/\s+/) ?? token.scopes,
  }
  await saveOAuthToken(next)
  return next
}

async function serviceAccountAccessToken() {
  const key = await readServiceAccount()
  if (!key) return null
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString(
    "base64url"
  )
  const claim = Buffer.from(
    JSON.stringify({
      iss: key.client_email,
      scope: SA_SCOPES.join(" "),
      aud: key.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url")
  const unsigned = `${header}.${claim}`
  const signer = createSign("RSA-SHA256")
  signer.update(unsigned)
  const jwt = `${unsigned}.${signer.sign(key.private_key, "base64url")}`
  const data = await exchangeToken(
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    })
  )
  return {
    accessToken: data.access_token as string,
    kind: "service-account" as const,
    email: key.client_email,
  }
}

export type GoogleAccess = {
  accessToken: string
  kind: "oauth" | "service-account"
  email?: string
}

export async function googleAccess(prefer: "oauth" | "any" = "any"): Promise<GoogleAccess | null> {
  const oauth = await readOAuthToken()
  if (oauth) {
    if (oauth.expiry - 30_000 > Date.now()) {
      return { accessToken: oauth.accessToken, kind: "oauth", email: oauth.email }
    }
    const refreshed = await refreshOAuth(oauth).catch(() => null)
    if (refreshed) {
      return {
        accessToken: refreshed.accessToken,
        kind: "oauth",
        email: refreshed.email,
      }
    }
  }
  if (prefer === "oauth") return null
  const sa = await serviceAccountAccessToken().catch(() => null)
  return sa
}

export async function googleStatus() {
  const client = await readOAuthClient()
  const oauth = await readOAuthToken()
  const sa = await readServiceAccount()
  const connected = Boolean(oauth?.refreshToken || (oauth && oauth.expiry > Date.now()))
  return {
    hasClient: Boolean(client),
    connected,
    email: oauth?.email ?? null,
    serviceAccount: sa?.client_email ?? null,
    canGmail: connected,
    canCalendar: connected || Boolean(sa),
    canDrive: connected || Boolean(sa),
    canTasks: connected || Boolean(sa),
    canContacts: connected,
    note: connected
      ? `Signed in as ${oauth?.email || "your Google account"}.`
      : sa
        ? `Service account ${sa.client_email} is loaded. Share calendars and Drive files with that email. It cannot open personal Gmail.`
        : "Not connected. Paste a free OAuth client, then Connect Google — a service account cannot open @gmail.com mail.",
  }
}
