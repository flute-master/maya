/** Turn a chat reply into something a voice can say without sounding like a screen reader. */
export function forSpokenText(text: string): string {
  let spoken = text.trim()
  if (!spoken) return ""

  spoken = spoken.replace(
    /^Assessment\s*\r?\nI used what I actually have[^\n]*\r?\n+(?:Answer\s*\r?\n)?/i,
    ""
  )
  spoken = spoken.replace(/^Here is what I actually ran[^\n]*\r?\n+/i, "")
  spoken = spoken.replace(/```[\s\S]*?```/g, " ")
  spoken = spoken.replace(/`([^`]+)`/g, "$1")
  spoken = spoken.replace(/\*\*([^*]+)\*\*/g, "$1")
  spoken = spoken.replace(/__([^_]+)__/g, "$1")
  spoken = spoken.replace(/\*([^*]+)\*/g, "$1")
  spoken = spoken.replace(/#{1,6}\s+/g, "")
  spoken = spoken.replace(/^\s*[-•*]\s+/gm, "")
  spoken = spoken.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
  spoken = spoken.replace(/https?:\/\/\S+/gi, "a link")
  spoken = spoken.replace(/www\.\S+/gi, "a link")
  spoken = spoken.replace(/\n{2,}/g, ". ")
  spoken = spoken.replace(/\n/g, ", ")
  spoken = spoken.replace(/\s{2,}/g, " ")
  spoken = spoken.replace(/\s+([,.;!?])/g, "$1")
  spoken = spoken.replace(/([.!?]){2,}/g, "$1")
  spoken = spoken.replace(/\s+—\s+/g, ", ")
  spoken = spoken.replace(/\s+–\s+/g, ", ")
  return spoken.trim()
}

export function spokenChunks(text: string): string[] {
  const spoken = forSpokenText(text)
  if (!spoken) return []
  const parts = spoken
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1)
  return parts.length ? parts : [spoken]
}
