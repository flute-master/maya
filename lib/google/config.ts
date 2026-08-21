import { join } from "node:path"

export const GOOGLE_DIR = join(process.cwd(), "data")
export const OAUTH_CLIENT_FILE = join(GOOGLE_DIR, "google-oauth-client.json")
export const OAUTH_TOKEN_FILE = join(GOOGLE_DIR, "google-oauth-token.json")
export const OAUTH_STATE_FILE = join(GOOGLE_DIR, "google-oauth-state.json")
export const SERVICE_ACCOUNT_FILE = join(GOOGLE_DIR, "google-service-account.json")

/** Free consumer Google APIs. Keep, Meet, and Photos Library are not these. */
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
]

export const SA_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
]

export type OAuthClient = {
  clientId: string
  clientSecret: string
}

export type OAuthToken = {
  accessToken: string
  refreshToken?: string
  expiry: number
  email?: string
  scopes?: string[]
}

export type ServiceAccountKey = {
  type?: string
  project_id?: string
  private_key_id?: string
  private_key: string
  client_email: string
  client_id?: string
  token_uri?: string
}
