import assert from "node:assert/strict"
import test from "node:test"

import {
  forgetMemory,
  saveMemory,
  searchMemories,
} from "../../lib/db/store"

test("sqlite memory save and search", () => {
  const marker = `eval-store-${Date.now()}`
  const row = saveMemory({
    content: `${marker} prefers local models`,
    type: "preference",
    confidence: 0.9,
    source: "test",
  })
  const hits = searchMemories(marker, 5)
  assert.ok(hits.some((item) => item.id === row.id))
  assert.equal(forgetMemory(row.id), true)
  const after = searchMemories(marker, 5)
  assert.equal(after.some((item) => item.id === row.id), false)
})
