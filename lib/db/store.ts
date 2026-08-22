import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"

import { newId } from "@/lib/id"
import { TOOL_POLICIES } from "@/lib/permissions/policies"

const DATA_DIR = join(process.cwd(), "data")
export const MAYA_DB_PATH = join(DATA_DIR, "maya.db")

export type StoredMemory = {
  id: string
  type: string
  content: string
  confidence: number
  source: string
  created_at: string
  updated_at: string
  archived: number
}

export type StoredTask = {
  id: string
  goal_id: string | null
  title: string
  description: string
  status: string
  due_at: string | null
  created_at: string
}

export type StoredPlan = {
  id: string
  title: string
  description: string
  status: string
  steps: Array<{ id: string; step_number: number; title: string; status: string }>
}

export type AuditRow = {
  id: string
  event_type: string
  actor: string
  tool_name: string | null
  input_summary: string | null
  result_summary: string | null
  allowed: number | null
  created_at: string
}

let db: DatabaseSync | null = null

function nowIso() {
  return new Date().toISOString()
}

export function getDb() {
  if (db) return db
  mkdirSync(DATA_DIR, { recursive: true })
  db = new DatabaseSync(MAYA_DB_PATH)
  db.exec("PRAGMA journal_mode = WAL;")
  db.exec("PRAGMA busy_timeout = 5000;")
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      confidence REAL DEFAULT 0.5,
      source TEXT,
      source_message_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_used_at TEXT,
      archived INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS memory_tags (
      memory_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (memory_id, tag)
    );
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      priority INTEGER DEFAULT 3,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      goal_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      priority INTEGER DEFAULT 3,
      due_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      goal_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS plan_steps (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      step_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      permission_mode TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      tool_name TEXT NOT NULL,
      scope TEXT,
      mode TEXT NOT NULL,
      expires_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL,
      tool_name TEXT,
      input_summary TEXT,
      result_summary TEXT,
      allowed INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER,
      created_at TEXT NOT NULL,
      indexed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      endpoint TEXT,
      enabled INTEGER DEFAULT 1,
      is_default INTEGER DEFAULT 0,
      capabilities TEXT
    );
  `)
  seedTools(db)
  return db
}

function seedTools(database: DatabaseSync) {
  const stamp = nowIso()
  const insert = database.prepare(
    `INSERT OR IGNORE INTO tools (id, name, description, enabled, permission_mode, created_at)
     VALUES (?, ?, ?, 1, ?, ?)`
  )
  for (const policy of TOOL_POLICIES) {
    insert.run(policy.id, policy.id, policy.description, policy.mode, stamp)
  }
}

export function searchMemories(query: string, limit = 8): StoredMemory[] {
  const database = getDb()
  const needle = `%${query.trim().slice(0, 80)}%`
  if (!query.trim()) {
    return database
      .prepare(
        `SELECT id, type, content, confidence, source, created_at, updated_at, archived
         FROM memories WHERE archived = 0 ORDER BY updated_at DESC LIMIT ?`
      )
      .all(limit) as StoredMemory[]
  }
  return database
    .prepare(
      `SELECT id, type, content, confidence, source, created_at, updated_at, archived
       FROM memories
       WHERE archived = 0 AND (content LIKE ? OR type LIKE ?)
       ORDER BY confidence DESC, updated_at DESC
       LIMIT ?`
    )
    .all(needle, needle, limit) as StoredMemory[]
}

export function saveMemory(input: {
  content: string
  type?: string
  confidence?: number
  source?: string
  id?: string
}): StoredMemory {
  const database = getDb()
  const stamp = nowIso()
  const row: StoredMemory = {
    id: input.id || newId(),
    type: input.type || "fact",
    content: input.content.trim().slice(0, 500),
    confidence: Math.min(0.99, Math.max(0.1, input.confidence ?? 0.7)),
    source: input.source || "user",
    created_at: stamp,
    updated_at: stamp,
    archived: 0,
  }
  const existing = database
    .prepare(`SELECT id FROM memories WHERE lower(content) = lower(?) AND archived = 0`)
    .get(row.content) as { id?: string } | undefined
  if (existing?.id) {
    database
      .prepare(
        `UPDATE memories SET confidence = MIN(0.95, confidence + 0.05), updated_at = ?, last_used_at = ? WHERE id = ?`
      )
      .run(stamp, stamp, existing.id)
    return { ...row, id: existing.id }
  }
  database
    .prepare(
      `INSERT INTO memories (id, type, content, confidence, source, created_at, updated_at, archived)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
    )
    .run(row.id, row.type, row.content, row.confidence, row.source, stamp, stamp)
  return row
}

export function forgetMemory(id: string) {
  const database = getDb()
  const result = database.prepare(`UPDATE memories SET archived = 1, updated_at = ? WHERE id = ?`).run(
    nowIso(),
    id
  )
  return result.changes > 0
}

export function forgetMemoryByText(query: string) {
  const database = getDb()
  const needle = `%${query.trim().slice(0, 80)}%`
  const rows = database
    .prepare(`SELECT id, content FROM memories WHERE archived = 0 AND content LIKE ?`)
    .all(needle) as Array<{ id: string; content: string }>
  for (const row of rows) {
    database.prepare(`UPDATE memories SET archived = 1, updated_at = ? WHERE id = ?`).run(nowIso(), row.id)
  }
  return rows
}

export function countMemories() {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM memories WHERE archived = 0`)
    .get() as { n: number }
  return Number(row.n || 0)
}

export function listTasks(status?: string): StoredTask[] {
  const database = getDb()
  if (status) {
    return database
      .prepare(
        `SELECT id, goal_id, title, description, status, due_at, created_at FROM tasks WHERE status = ? ORDER BY created_at DESC LIMIT 40`
      )
      .all(status) as StoredTask[]
  }
  return database
    .prepare(
      `SELECT id, goal_id, title, description, status, due_at, created_at FROM tasks WHERE status != 'cancelled' ORDER BY created_at DESC LIMIT 40`
    )
    .all() as StoredTask[]
}

export function createTask(input: {
  title: string
  description?: string
  due_at?: string
  goal_id?: string
}): StoredTask {
  const stamp = nowIso()
  const row: StoredTask = {
    id: newId(),
    goal_id: input.goal_id || null,
    title: input.title.trim().slice(0, 180),
    description: (input.description || "").slice(0, 500),
    status: "active",
    due_at: input.due_at || null,
    created_at: stamp,
  }
  getDb()
    .prepare(
      `INSERT INTO tasks (id, goal_id, title, description, status, priority, due_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', 3, ?, ?, ?)`
    )
    .run(row.id, row.goal_id, row.title, row.description, row.due_at, stamp, stamp)
  return row
}

export function createStoredPlan(input: { title: string; steps: string[] }): StoredPlan {
  const stamp = nowIso()
  const id = newId()
  const database = getDb()
  database
    .prepare(
      `INSERT INTO plans (id, title, description, status, created_at, updated_at) VALUES (?, ?, '', 'active', ?, ?)`
    )
    .run(id, input.title.trim().slice(0, 160), stamp, stamp)
  const steps = input.steps.slice(0, 12).map((title, index) => {
    const stepId = newId()
    database
      .prepare(
        `INSERT INTO plan_steps (id, plan_id, step_number, title, description, status) VALUES (?, ?, ?, ?, '', 'pending')`
      )
      .run(stepId, id, index + 1, title)
    return { id: stepId, step_number: index + 1, title, status: "pending" }
  })
  return { id, title: input.title, description: "", status: "active", steps }
}

export function listPlans(): StoredPlan[] {
  const database = getDb()
  const plans = database
    .prepare(`SELECT id, title, description, status FROM plans ORDER BY updated_at DESC LIMIT 12`)
    .all() as Array<{ id: string; title: string; description: string; status: string }>
  return plans.map((plan) => ({
    ...plan,
    steps: database
      .prepare(
        `SELECT id, step_number, title, status FROM plan_steps WHERE plan_id = ? ORDER BY step_number`
      )
      .all(plan.id) as StoredPlan["steps"],
  }))
}

export function writeAudit(input: {
  event_type: string
  actor?: string
  tool_name?: string
  input_summary?: string
  result_summary?: string
  allowed?: boolean
}) {
  getDb()
    .prepare(
      `INSERT INTO audit_log (id, event_type, actor, tool_name, input_summary, result_summary, allowed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      newId(),
      input.event_type,
      input.actor || "maya",
      input.tool_name || null,
      (input.input_summary || "").slice(0, 240) || null,
      (input.result_summary || "").slice(0, 240) || null,
      input.allowed == null ? null : input.allowed ? 1 : 0,
      nowIso()
    )
}

export function listAudit(limit = 20): AuditRow[] {
  return getDb()
    .prepare(
      `SELECT id, event_type, actor, tool_name, input_summary, result_summary, allowed, created_at
       FROM audit_log ORDER BY created_at DESC LIMIT ?`
    )
    .all(limit) as AuditRow[]
}

export function grantSession(tool: string, minutes = 30) {
  const expires = new Date(Date.now() + minutes * 60_000).toISOString()
  getDb()
    .prepare(
      `INSERT INTO permissions (id, tool_name, scope, mode, expires_at, created_at)
       VALUES (?, ?, 'session', 'allow', ?, ?)`
    )
    .run(newId(), tool, expires, nowIso())
}

export function hasSessionGrant(tool: string) {
  try {
    const row = getDb()
      .prepare(
        `SELECT id FROM permissions
         WHERE tool_name = ? AND mode = 'allow' AND (expires_at IS NULL OR expires_at > ?)
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(tool, nowIso()) as { id?: string } | undefined
    return Boolean(row?.id)
  } catch {
    return false
  }
}

export function syncVaultFacts(
  facts: Array<{ text: string; kind: string; confidence: number; source: string }>
) {
  for (const fact of facts.slice(0, 40)) {
    saveMemory({
      content: fact.text,
      type: fact.kind,
      confidence: fact.confidence,
      source: fact.source,
    })
  }
}

export function countOpenTasks() {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM tasks WHERE status = 'active'`)
    .get() as { n: number }
  return Number(row.n || 0)
}
