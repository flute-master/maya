import type { SageLayer } from "@/lib/sage/types"

/** Honest map of the Great Sage body — what this laptop app actually is. */
export const SAGE_LAYERS: SageLayer[] = [
  {
    ability: "Reasoning",
    how: "Ollama GPT-class model, plus the small net you train, plus on-device WebLLM",
    status: "live",
    note: "The brain is an existing model. We do not need to train Llama from zero.",
  },
  {
    ability: "Observe environment",
    how: "Files in her workspace, screen stills you share, live web pages",
    status: "partial",
    note: "She can keep a screenshot. She cannot see pixels without a vision model — describe them or run Python on the file.",
  },
  {
    ability: "Voice conversation",
    how: "Mic speech-to-text + spoken replies (edge-tts / system voice)",
    status: "live",
    note: "On by default. Text-only toggle is in the composer.",
  },
  {
    ability: "Memory",
    how: "Structured vault on disk + hashed vector recall over notes, chats, files",
    status: "live",
    note: "No hosted vector DB. Local JSON vectors on this machine.",
  },
  {
    ability: "Analyze information",
    how: "DuckDuckGo, Wikipedia, GitHub, fetch a URL, retrieve from memory",
    status: "live",
    note: "She does not drive your Chrome window.",
  },
  {
    ability: "Operate computer",
    how: "Sandbox files + links. Not desktop click-automation",
    status: "not-this-app",
    note: "A website cannot take over your mouse. That would be a separate local agent with OS permissions.",
  },
  {
    ability: "Google apps",
    how: "OAuth to your account (Calendar, Gmail, Drive, Docs, Sheets, Tasks, Contacts). Optional service account for shared Drive/Calendar",
    status: "partial",
    note: "A service account cannot open personal Gmail. Connect Google in Customize → Lookup. Keep, Meet, and Photos are not these APIs. She still cannot drive Chrome.",
  },
  {
    ability: "Use skills",
    how: "Tool loop: weather, maps, reminders, tasks, GitHub, files, Python, lookup, Google APIs",
    status: "live",
    note: "Sage core picks tools, then the model talks from the results.",
  },
  {
    ability: "Analyze data",
    how: "Python 3 in data/workspace, 8s timeout, confirm first",
    status: "live",
    note: "Drop a CSV, then ask her to run Python on it.",
  },
  {
    ability: "Learn your workflows",
    how: "Notes, conversation digest, style stats, vector recall",
    status: "partial",
    note: "She remembers facts and threads. She does not yet replay a full recorded workflow.",
  },
  {
    ability: "Execute tasks",
    how: "One-turn tool orchestration + in-app task list",
    status: "partial",
    note: "This turn can chain recall → fetch → Python. Multi-hour background jobs are not a separate worker yet.",
  },
  {
    ability: "Proactive behavior",
    how: "Reminders and alarms in this tab (notification + voice)",
    status: "live",
    note: "Only while Maya is open. Not the phone Clock app.",
  },
  {
    ability: "Safety",
    how: "Python and file writes ask before they run. Workspace is sandboxed",
    status: "live",
    note: "Allow once, or turn on always-allow in Customize → Lookup.",
  },
]
