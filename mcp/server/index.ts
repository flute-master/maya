#!/usr/bin/env npx tsx
/**
 * Maya MCP — interface TO Maya, not her brain.
 * Tools go through the permission engine. Shell is not exposed.
 */
import { createInterface } from "node:readline"

import { describeBrain } from "../../lib/core/brain"
import { getCoreSnapshot } from "../../lib/core/runtime"
import {
  createStoredPlan,
  createTask,
  forgetMemory,
  listAudit,
  listTasks,
  saveMemory,
  searchMemories,
  writeAudit,
} from "../../lib/db/store"
import { searchKnowledge } from "../../lib/knowledge/search"
import { decidePermission } from "../../lib/permissions/engine"
import { TOOL_POLICIES } from "../../lib/permissions/policies"
import { runPython } from "../../lib/sage/python"
import { listSkills } from "../../lib/skills/registry"

type Json = Record<string, unknown>

function ok(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result }
}

function fail(id: unknown, message: string, code = -32000) {
  return { jsonrpc: "2.0", id, error: { code, message } }
}

const TOOLS = [
  {
    name: "maya_get_state",
    description: "Maya runtime: brain, skills, permissions, offline set, open tasks",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "maya_get_permissions",
    description: "Permission table. The model cannot change these.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "maya_get_context",
    description: "Recent audit plus skill catalog",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "maya_memory_search",
    description: "Search local SQLite memories. Offline.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, limit: { type: "number" } },
    },
  },
  {
    name: "maya_memory_save",
    description: "Save a memory Maya should hold. Audited. Do not invent content.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string" },
        type: { type: "string" },
        confidence: { type: "number" },
      },
      required: ["content"],
    },
  },
  {
    name: "maya_memory_forget",
    description: "Archive a memory by id",
    inputSchema: {
      type: "object",
      properties: { memory_id: { type: "string" } },
      required: ["memory_id"],
    },
  },
  {
    name: "maya_get_tasks",
    description: "List local tasks",
    inputSchema: {
      type: "object",
      properties: { status: { type: "string" } },
    },
  },
  {
    name: "maya_create_task",
    description: "Create a local task",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        due_at: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "maya_create_plan",
    description: "Create a local plan with steps. Maya does not book flights.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        steps: { type: "array", items: { type: "string" } },
      },
      required: ["title"],
    },
  },
  {
    name: "maya_search_knowledge",
    description: "Search data/knowledge and the workspace. Offline text search. No embeddings.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, limit: { type: "number" } },
      required: ["query"],
    },
  },
  {
    name: "maya_run_python",
    description: "Request Python in the sandbox. Goes through the permission engine. May return needs_confirmation.",
    inputSchema: {
      type: "object",
      properties: { code: { type: "string" }, approved: { type: "boolean" } },
      required: ["code"],
    },
  },
  {
    name: "maya_ask",
    description: "Ask Maya a question via the local HTTP server if it is running. Offline fallback is the built-in engine state.",
    inputSchema: {
      type: "object",
      properties: { message: { type: "string" } },
      required: ["message"],
    },
  },
]

const RESOURCES = [
  { uri: "maya://state", name: "Maya state", mimeType: "application/json" },
  { uri: "maya://memory", name: "Maya memories", mimeType: "application/json" },
  { uri: "maya://tasks", name: "Maya tasks", mimeType: "application/json" },
  { uri: "maya://plans", name: "Maya plans", mimeType: "application/json" },
  { uri: "maya://permissions", name: "Maya permissions", mimeType: "application/json" },
]

async function callTool(name: string, args: Json) {
  writeAudit({
    event_type: "mcp_tool",
    actor: "mcp",
    tool_name: name,
    input_summary: JSON.stringify(args).slice(0, 200),
    allowed: true,
  })

  if (name === "maya_get_state") return getCoreSnapshot()
  if (name === "maya_get_permissions") return TOOL_POLICIES
  if (name === "maya_get_context") {
    return {
      skills: listSkills(),
      audit: listAudit(16),
      brain: await describeBrain(),
    }
  }
  if (name === "maya_memory_search") {
    return searchMemories(String(args.query || ""), Number(args.limit) || 8)
  }
  if (name === "maya_memory_save") {
    const content = String(args.content || "").trim()
    if (content.length < 3) return { error: "Nothing to remember." }
    return saveMemory({
      content,
      type: String(args.type || "fact"),
      confidence: typeof args.confidence === "number" ? args.confidence : 0.8,
      source: "mcp",
    })
  }
  if (name === "maya_memory_forget") {
    return { ok: forgetMemory(String(args.memory_id || "")) }
  }
  if (name === "maya_get_tasks") {
    return listTasks(args.status ? String(args.status) : undefined)
  }
  if (name === "maya_create_task") {
    return createTask({
      title: String(args.title || "Task"),
      description: args.description ? String(args.description) : undefined,
      due_at: args.due_at ? String(args.due_at) : undefined,
    })
  }
  if (name === "maya_create_plan") {
    const steps = Array.isArray(args.steps)
      ? args.steps.map((step) => String(step))
      : ["State the goal", "List what is true", "Name missing facts", "First action"]
    return createStoredPlan({ title: String(args.title || "Plan"), steps })
  }
  if (name === "maya_search_knowledge") {
    return searchKnowledge(String(args.query || ""), Number(args.limit) || 6)
  }
  if (name === "maya_run_python") {
    const decision = decidePermission({
      tool: "python",
      trust: {
        allowSearch: false,
        allowPython: false,
        allowFileWrite: false,
        allowGoogleWrite: false,
      },
      approved: args.approved === true,
    })
    if (!decision.allow) {
      writeAudit({
        event_type: "permission",
        actor: "mcp",
        tool_name: "python",
        allowed: false,
        result_summary: decision.reason,
      })
      return {
        needs_confirmation: true,
        reason: decision.reason,
        note: "Pass approved:true only after a human said yes. Maya will not silently run code.",
      }
    }
    const ran = await runPython(String(args.code || ""))
    writeAudit({
      event_type: "python",
      actor: "mcp",
      tool_name: "python",
      allowed: true,
      result_summary: ran.ok ? "ok" : "failed",
    })
    return ran
  }
  if (name === "maya_ask") {
    const base = process.env.MAYA_URL || "http://127.0.0.1:43217"
    const message = String(args.message || "").trim()
    try {
      const response = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: message }],
          personality: {
            name: "Maya",
            callMe: "Master",
            friend: 32,
            advisor: 94,
            companion: 90,
            tone: "calm",
            energy: "soft",
            traits: "Inner sage.",
            values: "Truth first.",
            boundaries: "No licensed advice.",
            customInstructions: "",
            voiceId: "ananya",
            bondId: "sage",
          },
          allowSearch: false,
        }),
      })
      const text = await response.text()
      return { ok: response.ok, text: text.slice(0, 4000), offlineLookup: true }
    } catch {
      return {
        ok: false,
        text: "Maya's HTTP server is not running. Memory, tasks, and permissions still work offline through the other MCP tools.",
      }
    }
  }
  throw new Error(`Unknown tool ${name}`)
}

async function readResource(uri: string) {
  if (uri === "maya://state") return getCoreSnapshot()
  if (uri === "maya://memory") return searchMemories("", 24)
  if (uri === "maya://tasks") return listTasks()
  if (uri === "maya://plans") {
    const { listPlans } = await import("../../lib/db/store")
    return listPlans()
  }
  if (uri === "maya://permissions") return TOOL_POLICIES
  throw new Error(`Unknown resource ${uri}`)
}

async function handle(message: Json) {
  const id = message.id
  const method = String(message.method || "")
  const params = (message.params || {}) as Json
  try {
    if (method === "initialize") {
      return ok(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: "maya", version: "0.2.0" },
      })
    }
    if (method === "notifications/initialized") return null
    if (method === "tools/list") return ok(id, { tools: TOOLS })
    if (method === "resources/list") return ok(id, { resources: RESOURCES })
    if (method === "tools/call") {
      const name = String(params.name || "")
      const args = (params.arguments || {}) as Json
      const result = await callTool(name, args)
      return ok(id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      })
    }
    if (method === "resources/read") {
      const uri = String(params.uri || "")
      const result = await readResource(uri)
      return ok(id, {
        contents: [
          { uri, mimeType: "application/json", text: JSON.stringify(result, null, 2) },
        ],
      })
    }
    if (method === "ping") return ok(id, {})
    return fail(id, `Unknown method ${method}`, -32601)
  } catch (caught) {
    return fail(id, caught instanceof Error ? caught.message : "MCP error")
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })
rl.on("line", async (line) => {
  const trimmed = line.trim()
  if (!trimmed) return
  let parsed: Json
  try {
    parsed = JSON.parse(trimmed) as Json
  } catch {
    return
  }
  const reply = await handle(parsed)
  if (reply) process.stdout.write(`${JSON.stringify(reply)}\n`)
})
