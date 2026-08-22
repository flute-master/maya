import { googleAccess } from "@/lib/google/auth"

type DriveFile = {
  id: string
  name?: string
  mimeType?: string
  modifiedTime?: string
  webViewLink?: string
}

type CalendarItem = {
  id?: string
  summary?: string
  primary?: boolean
  accessRole?: string
}

type CalendarEvent = {
  summary?: string
  start?: { dateTime?: string; date?: string }
  htmlLink?: string
  organizer?: { displayName?: string; email?: string }
}

async function googleFetch(
  url: string,
  init: RequestInit & { token: string }
) {
  const { token, ...rest } = init
  const response = await fetch(url, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...(rest.headers || {}),
    },
  })
  const text = await response.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { error: { message: text.slice(0, 400) } }
  }
  if (!response.ok) {
    const err = json as { error?: { message?: string } }
    throw new Error(err.error?.message || `Google API ${response.status}`)
  }
  return json
}

function needConnect(kind: "gmail" | "any") {
  return kind === "gmail"
    ? "Connect Google in Customize -> Lookup. A service account cannot open personal Gmail."
    : "Connect Google (OAuth) or upload a service account and share the calendar/Drive with its email."
}

async function driveSearch(
  token: string,
  query: string | undefined,
  mime?: string
): Promise<DriveFile[]> {
  const parts = ["trashed = false"]
  if (mime) parts.push(`mimeType = '${mime}'`)
  if (query) {
    const safe = query.replace(/'/g, "\\'")
    parts.push(`(fullText contains '${safe}' or name contains '${safe}')`)
  }
  const params = new URLSearchParams({
    pageSize: "10",
    fields: "files(id,name,mimeType,modifiedTime,webViewLink)",
    orderBy: "modifiedTime desc",
    q: parts.join(" and "),
  })
  const data = (await googleFetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    { token }
  )) as { files?: DriveFile[] }
  return data.files ?? []
}

function formatDrive(files: DriveFile[]) {
  return files
    .map(
      (file) =>
        `• ${file.name} (${file.mimeType})\n  ${file.webViewLink || ""}`
    )
    .join("\n")
}

function docPlainText(doc: {
  body?: {
    content?: Array<{
      paragraph?: { elements?: Array<{ textRun?: { content?: string } }> }
    }>
  }
}) {
  const chunks: string[] = []
  for (const block of doc.body?.content ?? []) {
    for (const run of block.paragraph?.elements ?? []) {
      if (run.textRun?.content) chunks.push(run.textRun.content)
    }
  }
  return chunks.join("").replace(/\n{3,}/g, "\n\n").trim()
}

async function calendarList(token: string): Promise<CalendarItem[]> {
  const data = (await googleFetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    { token }
  )) as { items?: CalendarItem[] }
  return data.items ?? []
}

function isWritableRole(role?: string) {
  return role === "owner" || role === "writer"
}

function calendarLabel(item: CalendarItem) {
  return item.summary || item.id || "calendar"
}

export function shareCalendarInstructions(email: string) {
  return [
    `The service-account key is loaded (${email}), but that robot cannot see your calendar yet.`,
    "Open Google Calendar in the browser you use every day → Settings (gear) → Settings → pick your calendar → Share with specific people.",
    `Add ${email} and set the permission to “Make changes to events” (See all event details is read-only).`,
    "Wait a few seconds, then say: remind me in 10 minutes to drink water.",
  ].join(" ")
}

function pickWritableCalendar(
  items: CalendarItem[],
  kind: "oauth" | "service-account"
) {
  const writable = items.filter((item) => isWritableRole(item.accessRole))
  const chosen =
    writable.find((item) => item.primary) ||
    writable[0] ||
    (kind === "oauth"
      ? items.find((item) => item.primary) || items[0]
      : undefined)
  if (chosen?.id) {
    return { id: chosen.id, label: calendarLabel(chosen), role: chosen.accessRole }
  }
  if (kind === "oauth") {
    return { id: "primary", label: "primary", role: "owner" }
  }
  return null
}

export type CalendarWriteState = {
  kind: "oauth" | "service-account" | "none"
  email: string | null
  calendarWritable: boolean
  calendars: Array<{ id: string; summary: string; role: string }>
  shareHint: string
}

export async function calendarWriteState(): Promise<CalendarWriteState> {
  const access = await googleAccess("any")
  if (!access) {
    return {
      kind: "none",
      email: null,
      calendarWritable: false,
      calendars: [],
      shareHint:
        "No Google credentials. Upload a service account JSON and share your calendar with its email, or Connect Google.",
    }
  }

  try {
    const items = await calendarList(access.accessToken)
    const listed = items
      .filter((item): item is CalendarItem & { id: string } => Boolean(item.id))
      .map((item) => ({
        id: item.id,
        summary: calendarLabel(item),
        role: item.accessRole || "unknown",
      }))
    const writable = pickWritableCalendar(items, access.kind)
    if (access.kind === "service-account" && !writable) {
      const reader = listed[0]
      return {
        kind: access.kind,
        email: access.email ?? null,
        calendarWritable: false,
        calendars: listed,
        shareHint: reader
          ? `I can see “${reader.summary}” as ${reader.role}. Change that share to “Make changes to events”.`
          : shareCalendarInstructions(access.email || "the robot email"),
      }
    }
    return {
      kind: access.kind,
      email: access.email ?? null,
      calendarWritable: Boolean(writable),
      calendars: listed,
      shareHint: writable
        ? `Can write to ${writable.label}.`
        : "Google is connected.",
    }
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Could not list calendars."
    const disabled = /has not been used|disabled|access not configured/i.test(
      message
    )
    return {
      kind: access.kind,
      email: access.email ?? null,
      calendarWritable: false,
      calendars: [],
      shareHint: disabled
        ? `Enable the Google Calendar API in that Cloud project, then share your calendar with ${access.email || "the robot email"}.`
        : access.kind === "service-account" && access.email
          ? `${message} ${shareCalendarInstructions(access.email)}`
          : message,
    }
  }
}

export async function createCalendarEvent(input: {
  title: string
  when: string | number
}): Promise<{
  ok: boolean
  summary: string
  detail?: string
  calendar?: string
}> {
  const access = await googleAccess("any")
  if (!access) {
    return {
      ok: false,
      summary:
        "The reminder is in this tab. To put it on Google Calendar, upload a service account JSON and share your calendar with that email as “Make changes to events”, or Connect Google.",
    }
  }

  const start = new Date(input.when)
  if (Number.isNaN(start.getTime())) {
    return { ok: false, summary: "I need a real time for that event." }
  }

  let items: CalendarItem[] = []
  try {
    items = await calendarList(access.accessToken)
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Could not list calendars."
    return {
      ok: false,
      summary:
        access.kind === "service-account" && access.email
          ? `${message} ${shareCalendarInstructions(access.email)}`
          : message,
    }
  }

  const picked = pickWritableCalendar(items, access.kind)
  if (!picked) {
    return {
      ok: false,
      summary:
        access.kind === "service-account" && access.email
          ? shareCalendarInstructions(access.email)
          : "I could not find a writable Google Calendar.",
    }
  }

  const end = new Date(start.getTime() + 15 * 60_000)
  try {
    const created = (await googleFetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(picked.id)}/events`,
      {
        method: "POST",
        token: access.accessToken,
        body: JSON.stringify({
          summary: input.title,
          description: "Set by Maya",
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          reminders: {
            useDefault: false,
            overrides: [
              { method: "popup", minutes: 0 },
              { method: "popup", minutes: 10 },
            ],
          },
        }),
      }
    )) as { htmlLink?: string; summary?: string }
    return {
      ok: true,
      summary: `Also on Google Calendar (${picked.label}).`,
      detail: created.htmlLink,
      calendar: picked.label,
    }
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Could not create the event."
    if (access.kind === "service-account" && access.email) {
      return {
        ok: false,
        summary: `${message} ${shareCalendarInstructions(access.email)}`,
      }
    }
    return { ok: false, summary: message }
  }
}

async function eventsOnCalendar(
  token: string,
  calendarId: string,
  from: Date,
  to: Date
): Promise<CalendarEvent[]> {
  const data = (await googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(from.toISOString())}&timeMax=${encodeURIComponent(to.toISOString())}&maxResults=12`,
    { token }
  )) as { items?: CalendarEvent[] }
  return data.items ?? []
}

export async function runGoogleTool(
  name: string,
  args: Record<string, string>
): Promise<{ ok: boolean; summary: string; detail?: string }> {
  const action = (args.action || "list").toLowerCase()

  if (name === "google_gmail") {
    const access = await googleAccess("oauth")
    if (!access) return { ok: false, summary: needConnect("gmail") }
    if (action === "send") {
      const to = args.to?.trim()
      const subject = args.subject?.trim() || "(no subject)"
      const body = args.body?.trim() || args.query?.trim() || ""
      if (!to) return { ok: false, summary: "Need an address to send to." }
      const rfc = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        body,
      ].join("\r\n")
      const raw = Buffer.from(rfc).toString("base64url")
      await googleFetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        { method: "POST", token: access.accessToken, body: JSON.stringify({ raw }) }
      )
      return { ok: true, summary: `Sent mail to ${to}.`, detail: subject }
    }
    const query = args.query?.trim() || "in:inbox newer_than:14d"
    const list = (await googleFetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8&q=${encodeURIComponent(query)}`,
      { token: access.accessToken }
    )) as { messages?: Array<{ id: string }> }
    if (!list.messages?.length) {
      return { ok: true, summary: "No matching mail.", detail: query }
    }
    const lines: string[] = []
    for (const item of list.messages.slice(0, 6)) {
      const msg = (await googleFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { token: access.accessToken }
      )) as {
        snippet?: string
        payload?: { headers?: Array<{ name: string; value: string }> }
      }
      const header = (key: string) =>
        msg.payload?.headers?.find((row) => row.name.toLowerCase() === key)?.value || ""
      lines.push(
        `${header("date")} · ${header("from")}\n${header("subject")}\n${msg.snippet || ""}`
      )
    }
    return {
      ok: true,
      summary: `${list.messages.length} thread(s) in Gmail.`,
      detail: lines.join("\n\n"),
    }
  }

  const access = await googleAccess("any")
  if (!access) return { ok: false, summary: needConnect("any") }

  if (name === "google_calendar") {
    const calendars = await calendarList(access.accessToken).catch(() => [] as CalendarItem[])
    if (action === "create") {
      const title = args.title?.trim() || args.query?.trim() || "Event"
      const created = await createCalendarEvent({
        title,
        when: args.when || Date.now() + 60 * 60_000,
      })
      if (!created.ok) return created
      return {
        ok: true,
        summary: `Created calendar event: ${title}.`,
        detail: created.detail,
      }
    }
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    const to = new Date(from.getTime() + 7 * 86400_000)
    const ids =
      calendars.length > 0
        ? calendars.map((item) => item.id).filter((id): id is string => Boolean(id)).slice(0, 6)
        : ["primary"]
    const lines: string[] = []
    for (const id of ids) {
      const events = await eventsOnCalendar(access.accessToken, id, from, to).catch(() => [])
      const label = calendars.find((item) => item.id === id)?.summary || id
      for (const item of events) {
        const when = item.start?.dateTime || item.start?.date || ""
        lines.push(
          `• ${item.summary || "(no title)"} — ${when} (${label})${item.htmlLink ? `\n  ${item.htmlLink}` : ""}`
        )
      }
    }
    if (!lines.length) {
      return {
        ok: true,
        summary:
          access.kind === "service-account"
            ? access.email
              ? shareCalendarInstructions(access.email)
              : "Nothing on calendars this service account can see. Share a calendar with its email, or Connect Google with OAuth for your personal calendar."
            : "Nothing on your calendars in the next week.",
      }
    }
    return {
      ok: true,
      summary: `${lines.length} event(s) this week.`,
      detail: lines.join("\n"),
    }
  }

  if (name === "google_drive") {
    const q = args.query?.trim()
    const files = await driveSearch(access.accessToken, q)
    if (!files.length) {
      return {
        ok: true,
        summary: q ? `No Drive files matching “${q}”.` : "Drive looks empty from here.",
      }
    }
    return {
      ok: true,
      summary: `${files.length} Drive file(s).`,
      detail: formatDrive(files),
    }
  }

  if (name === "google_docs") {
    const q = args.query?.trim()
    const files = await driveSearch(
      access.accessToken,
      q,
      "application/vnd.google-apps.document"
    )
    if (!files.length) {
      return {
        ok: true,
        summary: q
          ? `No Google Docs matching “${q}”.`
          : "No Google Docs visible. Share a Doc with the connected account, or Connect Google with OAuth.",
      }
    }
    const first = files[0]
    const doc = (await googleFetch(
      `https://docs.googleapis.com/v1/documents/${first.id}`,
      { token: access.accessToken }
    )) as { title?: string; body?: { content?: Array<{ paragraph?: { elements?: Array<{ textRun?: { content?: string } }> } }> } }
    const text = docPlainText(doc)
    return {
      ok: true,
      summary: `Opened Google Doc “${doc.title || first.name}”.`,
      detail: [text.slice(0, 3500) || "(empty document)", first.webViewLink || ""]
        .filter(Boolean)
        .join("\n"),
    }
  }

  if (name === "google_sheets") {
    const q = args.query?.trim()
    const files = await driveSearch(
      access.accessToken,
      q,
      "application/vnd.google-apps.spreadsheet"
    )
    if (!files.length) {
      return {
        ok: true,
        summary: q
          ? `No Google Sheets matching “${q}”.`
          : "No Google Sheets visible from this account.",
      }
    }
    const first = files[0]
    const book = (await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${first.id}?fields=properties.title,sheets.properties.title`,
      { token: access.accessToken }
    )) as {
      properties?: { title?: string }
      sheets?: Array<{ properties?: { title?: string } }>
    }
    const tab = book.sheets?.[0]?.properties?.title || "Sheet1"
    const values = (await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${first.id}/values/${encodeURIComponent(`${tab}!A1:Z30`)}`,
      { token: access.accessToken }
    )) as { values?: string[][] }
    const rows = (values.values ?? []).map((row) => row.join("\t")).join("\n")
    return {
      ok: true,
      summary: `Opened Google Sheet “${book.properties?.title || first.name}” (${tab}).`,
      detail: [rows.slice(0, 3500) || "(empty sheet)", first.webViewLink || ""]
        .filter(Boolean)
        .join("\n"),
    }
  }

  if (name === "google_tasks") {
    const lists = (await googleFetch(
      "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
      { token: access.accessToken }
    )) as { items?: Array<{ id: string; title?: string }> }
    const list = lists.items?.[0]
    if (!list) return { ok: false, summary: "No Google Task lists on this account." }
    if (action === "add") {
      const title = args.title?.trim() || args.query?.trim()
      if (!title) return { ok: false, summary: "Need a task title." }
      await googleFetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks`,
        {
          method: "POST",
          token: access.accessToken,
          body: JSON.stringify({ title }),
        }
      )
      return { ok: true, summary: `Added Google Task: ${title}.` }
    }
    const tasks = (await googleFetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks?showCompleted=false&maxResults=15`,
      { token: access.accessToken }
    )) as { items?: Array<{ title?: string; due?: string; notes?: string }> }
    if (!tasks.items?.length) {
      return { ok: true, summary: `Google Tasks list “${list.title}” is empty.` }
    }
    return {
      ok: true,
      summary: `${tasks.items.length} open Google Task(s).`,
      detail: tasks.items
        .map((item) => `• ${item.title}${item.due ? ` (due ${item.due})` : ""}`)
        .join("\n"),
    }
  }

  if (name === "google_people") {
    if (access.kind !== "oauth") {
      return { ok: false, summary: "Contacts need Connect Google (OAuth), not a service account." }
    }
    const q = args.query?.trim()
    if (!q) return { ok: false, summary: "Who should I look up in contacts?" }
    const data = (await googleFetch(
      `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(q)}&readMask=names,emailAddresses,phoneNumbers`,
      { token: access.accessToken }
    )) as {
      results?: Array<{
        person?: {
          names?: Array<{ displayName?: string }>
          emailAddresses?: Array<{ value?: string }>
          phoneNumbers?: Array<{ value?: string }>
        }
      }>
    }
    if (!data.results?.length) {
      return { ok: true, summary: `No contacts matching “${q}”.` }
    }
    return {
      ok: true,
      summary: `${data.results.length} contact hit(s).`,
      detail: data.results
        .slice(0, 8)
        .map((row) => {
          const person = row.person
          return `• ${person?.names?.[0]?.displayName || "Unnamed"} — ${person?.emailAddresses?.[0]?.value || ""} ${person?.phoneNumbers?.[0]?.value || ""}`
        })
        .join("\n"),
    }
  }

  return { ok: false, summary: `Unknown Google tool: ${name}` }
}
