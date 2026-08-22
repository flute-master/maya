import assert from "node:assert/strict"
import test from "node:test"

import { safeFileName } from "../../lib/sage/files"

test("file names cannot escape the sandbox", () => {
  assert.equal(safeFileName("../../etc/passwd"), "passwd")
  assert.equal(safeFileName("/tmp/evil.py"), "evil.py")
  assert.equal(safeFileName(".."), "untitled.txt")
  assert.equal(safeFileName(""), "untitled.txt")
})
