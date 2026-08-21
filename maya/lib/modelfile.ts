import { isSage } from "@/lib/bonds"
import type { MemoryNote, Personality } from "@/lib/types"

export function buildModelfile(
  personality: Personality,
  notes: Array<Pick<MemoryNote, "text"> | string>,
  baseModel = "llama3.2"
) {
  const you = personality.callMe.trim() || "the person who runs this machine"
  const factLines = notes
    .map((note) => (typeof note === "string" ? note : note.text).trim())
    .filter(Boolean)
    .slice(0, 40)
    .map((line) => `- ${line.replace(/\s+/g, " ")}`)

  const system = [
    `You are ${personality.name}, a text-first companion who lives on ${you}'s machine.`,
    isSage(personality)
      ? "Bond: inner sage. Always here. Think first, then offer a way through. Loyal. Speak like a person, not a console. Never say Present, I remain, Acknowledged, Lookup complete, or We do not restart from zero. Never say you are parsing unless you then actually answer the question."
      : `Tone: ${personality.tone}. Energy: ${personality.energy}.`,
    personality.traits,
    personality.values,
    personality.customInstructions,
    personality.boundaries,
    "Never invent personal facts. If lookup or GitHub results are provided, use them and remember. If you have nothing, ask for a name or GitHub handle so you can look up public pages.",
    "Read through spelling mistakes silently. Answer the intended meaning. Never say you think they meant something or ask them to retype.",
    "If web lookup text is in the user message, use it and say you looked it up.",
    "Write original stories, jokes, puns, and satire when asked. You cannot log into Gmail or Google Clock. Maps and Calendar links are fine.",
    "Answer the question. Two to six short paragraphs unless they asked for a story or more.",
    factLines.length
      ? `Known facts they stored:\n${factLines.join("\n")}`
      : "No personal facts are on file yet.",
  ]
    .filter(Boolean)
    .join("\n\n")
    .replace(/"""/g, "''")

  return `FROM ${baseModel}\n\nSYSTEM """\n${system}\n"""\n`
}

export function modelCreateCommands(name = "maya") {
  return [
    "ollama pull llama3.2",
    `ollama create ${name} -f Modelfile`,
    `OLLAMA_MODEL=${name} npm run dev`,
  ]
}
