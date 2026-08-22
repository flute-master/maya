import assert from "node:assert/strict"
import test from "node:test"

import { isReminderAsk, parsePlan } from "../../lib/reminders"

const now = Date.parse("2026-08-22T12:00:00.000Z")

test("natural reminder phrases parse a time", () => {
  const relative = parsePlan("set up a reminder in 10 minutes to drink water", now)
  assert.ok(relative && relative.kind === "reminder")
  if (relative.kind === "reminder") {
    assert.equal(relative.at, now + 10 * 60_000)
    assert.match(relative.label, /drink water/i)
  }

  const setup = parsePlan("setup reminder at 7pm", now)
  assert.ok(setup && setup.kind === "reminder")

  const polite = parsePlan("can you remind me in 5 minutes", now)
  assert.ok(polite && polite.kind === "reminder")
  if (polite.kind === "reminder") {
    assert.equal(polite.at, now + 5 * 60_000)
  }

  const after = parsePlan("remind me after 2 hours to stretch", now)
  assert.ok(after && after.kind === "reminder")
  if (after.kind === "reminder") {
    assert.equal(after.at, now + 2 * 3_600_000)
    assert.match(after.label, /stretch/i)
  }
})

test("reminder without a time asks when", () => {
  const plan = parsePlan("set up a reminder")
  assert.deepEqual(plan, { kind: "need-time" })
})

test("casual reminder talk is not a planner ask", () => {
  assert.equal(isReminderAsk("that reminds me of home"), false)
  assert.equal(parsePlan("that reminds me of home"), null)
  assert.equal(parsePlan("I took the metro yesterday"), null)
})
