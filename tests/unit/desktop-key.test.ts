import assert from "node:assert/strict"
import test from "node:test"

import { parseServiceAccount } from "../../lib/google/auth"
import {
  DESKTOP_KEY_NAME,
  linuxDesktopKeyPath,
  serviceAccountCandidatePaths,
} from "../../lib/google/desktop-key"

test("desktop drop file has a stable name", () => {
  assert.equal(DESKTOP_KEY_NAME, "maya-google-service-account.json")
  assert.match(linuxDesktopKeyPath(), /maya-google-service-account\.json$/)
})

test("Maya looks in data/ and Desktop for the key", () => {
  const paths = serviceAccountCandidatePaths()
  assert.ok(paths.some((path) => path.endsWith("data/google-service-account.json")))
  assert.ok(paths.some((path) => path.endsWith(DESKTOP_KEY_NAME)))
})

test("oauth client files are rejected as service accounts", () => {
  assert.throws(
    () =>
      parseServiceAccount({
        type: "authorized_user",
        client_email: "x@y.com",
        private_key: "nope",
      }),
    /service account/i
  )
})
