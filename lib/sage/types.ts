export type ToolName =
  | "recall"
  | "lookup"
  | "weather"
  | "news"
  | "fetch_page"
  | "python"
  | "files_list"
  | "files_read"
  | "files_write"
  | "observe"
  | "maps"
  | "calc"
  | "music"
  | "flute"
  | "otaku"
  | "google_calendar"
  | "google_gmail"
  | "google_drive"
  | "google_docs"
  | "google_sheets"
  | "google_tasks"
  | "google_people"
  | "mind"

export type ToolRisk = "none" | "net" | "write" | "code"

export type ToolCall = {
  name: ToolName
  args: Record<string, string>
  reason: string
  risk: ToolRisk
}

export type ToolResult = {
  name: ToolName
  ok: boolean
  summary: string
  detail?: string
  url?: string
  reading?: import("@/lib/otaku").ReadingItem[]
  facts?: import("@/lib/mind").MindFact[]
  plan?: import("@/lib/mind").MindPlan
}

export type PendingConfirm = {
  name: ToolName
  args: Record<string, string>
  reason: string
  risk: ToolRisk
}

export type ToolApproval = {
  name: string
  args?: Record<string, string>
}

export type SageTrust = {
  allowSearch: boolean
  allowPython: boolean
  allowFileWrite: boolean
  allowGoogleWrite: boolean
}

export type SageRun = {
  calls: ToolCall[]
  results: ToolResult[]
  pending: PendingConfirm[]
  retrieved: string[]
}

export type SageLayer = {
  ability: string
  how: string
  status: "live" | "partial" | "not-this-app"
  note: string
}
