import assert from "node:assert/strict"
import test from "node:test"

import { readBrainInstall } from "../../lib/brain-setup"

test("brain install status is readable without throwing", () => {
  const status = readBrainInstall()
  assert.equal(typeof status.running, "boolean")
  assert.ok("error" in status || status.error === undefined)
})
