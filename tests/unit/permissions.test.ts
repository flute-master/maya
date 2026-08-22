import assert from "node:assert/strict"
import test from "node:test"

import { decidePermission } from "../../lib/permissions/engine"
import { policyFor } from "../../lib/permissions/policies"
import { listSkills } from "../../lib/skills/registry"

const trustOff = {
  allowSearch: false,
  allowPython: false,
  allowFileWrite: false,
  allowGoogleWrite: false,
}

const trustOn = {
  allowSearch: true,
  allowPython: true,
  allowFileWrite: true,
  allowGoogleWrite: true,
}

test("weather is automatic when internet is on", () => {
  const decision = decidePermission({ tool: "weather", trust: trustOn })
  assert.equal(decision.allow, true)
  assert.equal(decision.pending, false)
})

test("weather asks when internet is off", () => {
  const decision = decidePermission({ tool: "weather", trust: trustOff })
  assert.equal(decision.pending, true)
})

test("python asks unless always-allow or approved", () => {
  const blocked = decidePermission({ tool: "python", trust: trustOff })
  assert.equal(blocked.pending, true)
  const allowed = decidePermission({ tool: "python", trust: trustOn })
  assert.equal(allowed.allow, true)
  const once = decidePermission({ tool: "python", trust: trustOff, approved: true })
  assert.equal(once.allow, true)
})

test("shell is disabled", () => {
  const decision = decidePermission({ tool: "shell", trust: trustOn })
  assert.equal(decision.allow, false)
  assert.equal(decision.mode, "disabled")
})

test("gmail send always asks; gmail read does not", () => {
  const send = decidePermission({
    tool: "google_gmail",
    action: "send",
    trust: trustOn,
  })
  assert.equal(send.pending, true)
  const read = decidePermission({
    tool: "google_gmail",
    action: "list",
    trust: trustOn,
  })
  assert.equal(read.allow, true)
})

test("unregistered tools always ask", () => {
  assert.equal(policyFor("mystery_tool").mode, "always_ask")
})

test("skill registry lists offline and network skills", () => {
  const skills = listSkills()
  assert.ok(skills.some((skill) => skill.id === "memory" && skill.offline))
  assert.ok(skills.some((skill) => skill.id === "weather" && skill.network))
  assert.ok(skills.some((skill) => skill.id === "coding"))
})
