import assert from "node:assert/strict"
import test from "node:test"

import { isMusicQuery, musicQuery } from "../../lib/music"
import { stripSageChrome } from "../../lib/mind"
import { forSpokenText } from "../../lib/spoken-text"
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

test("song asks are YouTube music queries", () => {
  assert.equal(isMusicQuery("play tum hi ho"), true)
  assert.equal(isMusicQuery("song kesariya"), true)
  assert.equal(musicQuery("play tum hi ho on youtube"), "tum hi ho")
})

test("voice reads the answer, not headers", () => {
  const spoken = forSpokenText(
    [
      "Here is what I actually ran — not a guess.",
      "music: Tum Hi Ho",
      "Playing: Tum Hi Ho",
      "YouTube: https://www.youtube.com/watch?v=Umqb9KENgmk",
    ].join("\n")
  )
  assert.doesNotMatch(spoken, /assessment/i)
  assert.doesNotMatch(spoken, /here is what i actually ran/i)
  assert.match(spoken, /tum hi ho/i)
})
