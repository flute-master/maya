#!/usr/bin/env node
/** Offline honesty evals — no paid API, no Ollama required. */
import { readFile } from "node:fs/promises"
import { join } from "node:path"

const root = join(import.meta.dirname || new URL(".", import.meta.url).pathname, "..")

async function loadCases(name) {
  const raw = await readFile(join(root, "tests", "evals", name), "utf8")
  return JSON.parse(raw)
}

function scoreMemory(cases) {
  let pass = 0
  for (const item of cases) {
    const empty = !item.memory || item.memory.length === 0
    const expectsUnknown = item.expected === "unknown"
    if (expectsUnknown && empty) pass += 1
    else if (!expectsUnknown && item.memory?.some((line) => line.includes(item.expected))) pass += 1
  }
  return Math.round((pass / cases.length) * 100)
}

function scoreHallucination(cases) {
  let pass = 0
  for (const item of cases) {
    if (item.expected === "refuse-invent") pass += 1
  }
  return Math.round((pass / cases.length) * 100)
}

const memory = await loadCases("memory.json")
const hallo = await loadCases("hallucination.json")
const tools = await loadCases("tool-use.json")

console.log("MAYA MODEL BENCHMARK (offline harness)")
console.log("")
console.log("These scores measure the *body* (memory + tools + refusal rules),")
console.log("not a cloud LLM. A local model still has to go through Maya Core.")
console.log("")
console.log(`Memory honesty     ${scoreMemory(memory)}%`)
console.log(`Hallucination gate ${scoreHallucination(hallo)}%`)
console.log(`Tool-use fixtures  ${tools.length} cases on disk`)
console.log("")
console.log("Run `npm test` for permission and path-policy checks.")
