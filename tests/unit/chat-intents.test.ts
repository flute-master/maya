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
  isWeatherQuery,
  mapsQuery,
} from "../../lib/skills"
import { isFluteQuery } from "../../lib/flute"
import { isMindQuery } from "../../lib/mind"
import { isOtakuQuery } from "../../lib/otaku"
import { planTools } from "../../lib/sage/plan"
import { searchQueryFor } from "../../lib/search"
import { intendedMeaning } from "../../lib/typos"
import { replyLocally } from "../../lib/local-companion"
import { skipTinyNet } from "../../lib/trained"
import { looksGenericAssistant } from "../../lib/ollama"

test("refresh clears the screen command", () => {
  assert.equal(isClearScreenCommand("refresh"), true)
  assert.equal(isClearScreenCommand("Clear the screen"), true)
  assert.equal(isClearScreenCommand("new chat"), true)
  assert.equal(intendedMeaning("new chat").toLowerCase(), "new chat")
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

test("hurried typos keep the intended skill", () => {
  assert.equal(intendedMeaning("another onw").toLowerCase(), "another one")
  assert.equal(intendedMeaning("Tell me a joke]").toLowerCase(), "tell me a joke")
  assert.equal(intendedMeaning("weathere in hyderbad").toLowerCase(), "weather in hyderabad")
  assert.equal(intendedMeaning("You are uo").toLowerCase(), "you are up")
  assert.equal(intendedMeaning("refesh").toLowerCase(), "refresh")
  assert.equal(intendedMeaning("ply tum hi ho").toLowerCase(), "play tum hi ho")
  assert.equal(isClearScreenCommand("refesh"), true)
  assert.equal(isMapsQuery("wfa miyapr metro"), true)
  assert.match(mapsQuery("wfa miyapr metro") || "", /miyapur/i)
  assert.equal(isMusicQuery("ply kesariya"), true)
})

test("joke follow-ups survive typos", () => {
  const history = [
    { role: "user", content: "Tell me a joke]" },
    { role: "assistant", content: "A joke." },
  ]
  assert.equal(isCreativeQuery("Tell me a joke]"), true)
  assert.equal(isJokeFollowUp("another onw", history), true)
  assert.equal(isJokeFollowUp("anothr one", history), true)
  assert.equal(isJokeFollowUp("another onw", []), true)
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

test("short talk skips only the tiny net, not the meaning", () => {
  assert.equal(skipTinyNet("so you are smart now"), true)
  assert.equal(intendedMeaning("who are u to me").toLowerCase(), "who are you to me")
})

test("smart-now does not get a wander line", () => {
  const text = replyLocally(
    [
      { id: "1", role: "user", content: "hi", createdAt: 1 },
      { id: "2", role: "assistant", content: "Hey.", createdAt: 2 },
      { id: "3", role: "user", content: "so you are smart now", createdAt: 3 },
    ],
    {
      name: "Maya",
      callMe: "Ruthvik",
      friend: 40,
      advisor: 95,
      companion: 45,
      tone: "direct",
      energy: "balanced",
      bondId: "sage",
      traits: "",
      values: "",
      voiceId: "elise",
      customInstructions: "",
      boundaries: "",
    }
  )
  assert.doesNotMatch(text, /better would look like/i)
  assert.doesNotMatch(text, /decision or a feeling/i)
  assert.match(text, /maya/i)
})

test("casual talk does not fire features", () => {
  assert.equal(isMapsQuery("I took the metro yesterday"), false)
  assert.equal(isMapsQuery("Miyapur Metro is crowded"), false)
  assert.equal(isMusicQuery("I love that song"), false)
  assert.equal(isWeatherQuery("the weather was awful yesterday"), false)
  assert.equal(isOtakuQuery("I watched anime last night"), false)
  assert.equal(isFluteQuery("I saw a flute in a shop"), false)
  assert.equal(isMindQuery("good morning"), false)
  assert.equal(searchQueryFor("Why did the chicken cross the road?"), null)
  assert.equal(searchQueryFor("what is love"), null)
  assert.ok(planTools("I took the metro yesterday").length === 0)
  assert.ok(planTools("I watched anime last night").length === 0)
})

test("features fire only when asked", () => {
  assert.equal(isMapsQuery("way to miyapur metro"), true)
  assert.equal(isMapsQuery("take me to Charminar"), true)
  assert.equal(isMusicQuery("play tum hi ho"), true)
  assert.equal(isMusicQuery("song kesariya"), true)
  assert.equal(isWeatherQuery("weather in Hyderabad"), true)
  assert.equal(isOtakuQuery("Where can I read Frieren and watch the anime legally?"), true)
  assert.equal(isFluteQuery("Teach me flute. I am a beginner."), true)
  assert.ok(planTools("way to miyapur metro").some((call) => call.name === "maps"))
  assert.ok(planTools("play tum hi ho").some((call) => call.name === "music"))
  assert.equal(planTools("so you are smart now").length, 0)
})

test("generic assistant sludge is rejected", () => {
  assert.equal(
    looksGenericAssistant(
      "I don't have personal intelligence or consciousness. What can I help you with today?"
    ),
    true
  )
  assert.equal(looksGenericAssistant("I'm Maya. The local model is loaded."), false)
})
