export type PermissionMode = "automatic" | "ask" | "always_ask" | "disabled"

export type ToolPolicy = {
  id: string
  label: string
  description: string
  mode: PermissionMode
  network: boolean
  offline: boolean
  skill: string
}

/** Default policy. The model never overrides this. Maya Core does. */
export const TOOL_POLICIES: ToolPolicy[] = [
  { id: "weather", label: "Weather", description: "Live weather for a city", mode: "automatic", network: true, offline: false, skill: "weather" },
  { id: "news", label: "News", description: "Headlines", mode: "automatic", network: true, offline: false, skill: "web" },
  { id: "lookup", label: "Web search", description: "DuckDuckGo, Wikipedia, public GitHub", mode: "automatic", network: true, offline: false, skill: "web" },
  { id: "fetch_page", label: "Fetch page", description: "Read a URL you named", mode: "automatic", network: true, offline: false, skill: "web" },
  { id: "maps", label: "Maps", description: "Google Maps links. She does not drive Chrome", mode: "automatic", network: true, offline: false, skill: "web" },
  { id: "music", label: "Music", description: "YouTube play links", mode: "automatic", network: true, offline: false, skill: "web" },
  { id: "otaku", label: "Otaku shelf", description: "Official manga and episode links", mode: "automatic", network: true, offline: false, skill: "web" },
  { id: "recall", label: "Memory read", description: "Search stored notes and chats", mode: "automatic", network: false, offline: true, skill: "memory" },
  { id: "mind", label: "Mind", description: "Facts, plans, Analysis Chamber", mode: "automatic", network: false, offline: true, skill: "planning" },
  { id: "calc", label: "Calculator", description: "Local expressions", mode: "automatic", network: false, offline: true, skill: "python" },
  { id: "flute", label: "Flute", description: "Lessons and clip pitch", mode: "automatic", network: false, offline: true, skill: "flute" },
  { id: "files_list", label: "Files list", description: "List data/workspace", mode: "automatic", network: false, offline: true, skill: "files" },
  { id: "files_read", label: "Files read", description: "Read sandbox files only", mode: "automatic", network: false, offline: true, skill: "files" },
  { id: "files_write", label: "Files write", description: "Write inside data/workspace", mode: "ask", network: false, offline: true, skill: "files" },
  { id: "python", label: "Python", description: "Sandbox, 8s, python3 -I", mode: "ask", network: false, offline: true, skill: "python" },
  { id: "google_calendar", label: "Google Calendar", description: "List is read. Create asks.", mode: "ask", network: true, offline: false, skill: "google" },
  { id: "google_gmail", label: "Gmail", description: "Send always asks. Read needs OAuth.", mode: "always_ask", network: true, offline: false, skill: "google" },
  { id: "google_drive", label: "Google Drive", description: "Search Drive", mode: "ask", network: true, offline: false, skill: "google" },
  { id: "google_docs", label: "Google Docs", description: "Read a Doc", mode: "ask", network: true, offline: false, skill: "google" },
  { id: "google_sheets", label: "Google Sheets", description: "Read a Sheet", mode: "ask", network: true, offline: false, skill: "google" },
  { id: "google_tasks", label: "Google Tasks", description: "List or add", mode: "ask", network: true, offline: false, skill: "google" },
  { id: "google_people", label: "Google Contacts", description: "Search contacts", mode: "ask", network: true, offline: false, skill: "google" },
  { id: "observe", label: "Screen still", description: "Reports stored stills. Capture is the browser prompt. No vision model.", mode: "automatic", network: false, offline: true, skill: "vision" },
  { id: "shell", label: "Shell", description: "Arbitrary shell. Not this app.", mode: "disabled", network: false, offline: false, skill: "coding" },
]

const BY_ID = new Map(TOOL_POLICIES.map((item) => [item.id, item]))

export function policyFor(tool: string): ToolPolicy {
  return (
    BY_ID.get(tool) || {
      id: tool,
      label: tool,
      description: "Unregistered tool",
      mode: "always_ask",
      network: true,
      offline: false,
      skill: "unknown",
    }
  )
}

export function offlineSkillIds() {
  return TOOL_POLICIES.filter((item) => item.offline && item.mode !== "disabled").map(
    (item) => item.id
  )
}
