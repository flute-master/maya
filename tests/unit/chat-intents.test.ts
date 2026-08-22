import assert from "node:assert/strict"
import test from "node:test"

import { stripSageChrome } from "../../lib/mind"
import {
  isClearScreenCommand,
  isCreativeQuery,
  isDirectionsQuery,
  isJokeFollowUp,
  isMapsQuery,
  mapsQuery,
} from "../../lib/skills"
import { intendedMeaning } from "../../lib/typos"

test("refresh clears the screen command", () => {
  assert.equal(isClearScreenCommand("refresh"), true)
  assert.equal(isClearScreenCommand("Clear the screen"), true)
  assert.equal(isClearScreenCommand("new chat"), true)
  assert.equal(isClearScreenCommand("weather in Hyderabad"), false)
})

test("way to metro is a maps / directions ask", () => {
  assert.equal(isMapsQuery("way to miyapur metro"), true)
  assert.equal(isDirectionsQuery("way to miyapur metro"), true)
  assert.equal(mapsQuery("way to miyapur metro"), "miyapur metro")
})

test("wafa typo becomes way to", () => {
  const meaning = intendedMeaning("Wafa Miyapur Metro")
  assert.match(meaning.toLowerCase(), /way to/)
  assert.equal(isMapsQuery(meaning), true)
  const dest = mapsQuery(meaning)
  assert.ok(dest && /miyapur/i.test(dest))
})

test("joke follow-ups stay jokes", () => {
  const history = [
    { role: "user", content: "Hi so tell me a joke" },
    { role: "assistant", content: "A joke." },
  ]
  assert.equal(isCreativeQuery("tell another joke"), true)
  assert.equal(isJokeFollowUp("That's terrible", history), true)
  assert.equal(isJokeFollowUp("Yes", history), true)
  assert.equal(isJokeFollowUp("Yes", []), false)
})

test("stock Assessment chrome is stripped", () => {
  const raw = [
    "Assessment",
    "I used what I actually have — memory, tools, or an honest gap. I did not decorate a guess.",
    "",
    "Answer",
    "Here is the joke.",
  ].join("\n")
  assert.equal(stripSageChrome(raw), "Here is the joke.")
})
