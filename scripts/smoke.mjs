#!/usr/bin/env node
/** Hit a running Maya dev server and check the live feature slice. */
const BASE = process.env.MAYA_URL || "http://127.0.0.1:43217"

const personality = {
  name: "Maya",
  callMe: "Master",
  friend: 32,
  advisor: 94,
  companion: 90,
  tone: "calm",
  energy: "soft",
  traits: "Inner sage.",
  values: "Truth first.",
  boundaries: "No licensed advice.",
  customInstructions: "",
  voiceId: "ananya",
  bondId: "sage",
}

let failed = 0
const results = []

function ok(name, pass, detail) {
  results.push({ name, pass, detail })
  if (!pass) failed += 1
  const mark = pass ? "PASS" : "FAIL"
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`)
}

async function req(path, init = {}) {
  const headers = { ...(init.headers || {}) }
  const response = await fetch(`${BASE}${path}`, { ...init, headers })
  const raw = await response.text()
  let json = null
  try {
    json = raw ? JSON.parse(raw) : null
  } catch {
    json = null
  }
  return { response, raw, json, headers: response.headers }
}

async function chat(text, extra = {}) {
  const started = Date.now()
  const { history, ...rest } = extra
  const { response, raw, headers } = await req("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        ...(Array.isArray(history) ? history : []),
        { role: "user", content: text },
      ],
      personality,
      ...rest,
    }),
  })
  return {
    status: response.status,
    body: raw,
    mode: headers.get("x-maya-mode"),
    engine: headers.get("x-maya-engine"),
    tools: headers.get("x-maya-tools"),
    confirm: headers.get("x-maya-confirm"),
    ms: Date.now() - started,
  }
}

function has(hay, needle) {
  return hay.toLowerCase().includes(String(needle).toLowerCase())
}

async function main() {
  const home = await req("/")
  ok("GET /", home.response.ok, `status ${home.response.status}`)
  ok(
    "homepage is a Next app, not a stub",
    home.raw.includes("__NEXT_DATA__") || home.raw.includes("/_next/"),
    home.raw.slice(0, 80).replace(/\s+/g, " ")
  )

  const chunk = home.raw.match(/\/_next\/static\/chunks\/[A-Za-z0-9._-]+\.js/)
  if (chunk) {
    const withOrigin = await fetch(`${BASE}${chunk[0]}`, {
      headers: { Origin: "http://127.0.0.1:43217" },
    })
    ok(
      "JS chunk from 127.0.0.1 Origin is not 403",
      withOrigin.status === 200,
      `status ${withOrigin.status} ${chunk[0]}`
    )
  } else {
    ok("JS chunk listed on homepage", false, "no /_next/static/chunks match")
  }

  const hear = await req("/hear.html")
  ok("GET /hear.html", hear.response.ok && has(hear.raw, "play"), `status ${hear.response.status}`)
  const clip = await req("/clips/sage.mp3")
  ok(
    "GET /clips/sage.mp3",
    clip.response.ok && Number(clip.response.headers.get("content-length") || 0) > 1000,
    `status ${clip.response.status}`
  )

  for (const path of [
    "/api/chat",
    "/api/google",
    "/api/files",
    "/api/memory",
    "/api/runtime",
    "/api/model",
    "/api/train",
    "/api/music",
  ]) {
    const hit = await req(path)
    ok(`GET ${path}`, hit.response.ok, `status ${hit.response.status}`)
  }

  const empty = await chat("   ")
  ok("empty chat is 400", empty.status === 400, `status ${empty.status}`)

  const identity = await chat("Who are you to me?")
  ok("identity 200", identity.status === 200, `status ${identity.status} ${identity.ms}ms`)
  ok(
    "identity names Maya and does not claim Raphael",
    identity.status === 200 &&
      has(identity.body, "Maya") &&
      has(identity.body, "inner sage") &&
      !has(identity.body, "Raphael"),
    identity.body.slice(0, 180).replace(/\s+/g, " ")
  )
  ok(
    "identity mentions Google connect or APIs",
    has(identity.body, "Google"),
    identity.body.slice(0, 220).replace(/\s+/g, " ")
  )
  ok(
    "identity does not drive Chrome",
    has(identity.body, "Chrome") || has(identity.body, "mouse"),
    identity.body.slice(0, 180).replace(/\s+/g, " ")
  )
  ok(
    "identity addresses Master by default",
    has(identity.body, "Master"),
    identity.body.slice(0, 160).replace(/\s+/g, " ")
  )

  const canDo = await chat("What can you actually do on this machine?")
  ok("capabilities 200", canDo.status === 200)
  ok(
    "capabilities are not a hang/parsing stub",
    canDo.status === 200 &&
      canDo.body.length > 40 &&
      !/^parsing\b/i.test(canDo.body.trim()),
    canDo.body.slice(0, 160).replace(/\s+/g, " ")
  )

  const cal = await chat("What's on my Google Calendar today?")
  ok("calendar 200", cal.status === 200, `mode ${cal.mode} engine ${cal.engine}`)
  ok(
    "calendar uses google_calendar tool",
    Boolean(cal.tools && has(cal.tools, "google_calendar")),
    cal.tools || "no tools header"
  )
  ok(
    "calendar is honest, no invented events",
    cal.status === 200 &&
      (has(cal.body, "Connect Google") ||
        has(cal.body, "service account") ||
        has(cal.body, "event") ||
        has(cal.body, "Nothing on")) &&
      !/\b(dentist|standup|1:1|lunch with)\b/i.test(cal.body),
    cal.body.slice(0, 220).replace(/\s+/g, " ")
  )

  const mail = await chat("unread email")
  ok(
    "gmail asks to connect, no fake inbox",
    mail.status === 200 &&
      has(mail.body, "Connect Google") &&
      has(mail.tools || "", "google_gmail") &&
      !has(mail.body, "From:"),
    mail.body.slice(0, 180).replace(/\s+/g, " ")
  )

  const drive = await chat("search drive notes")
  ok(
    "drive is honest",
    drive.status === 200 &&
      (has(drive.body, "Connect Google") ||
        has(drive.body, "Drive") ||
        has(drive.body, "share")),
    drive.body.slice(0, 160).replace(/\s+/g, " ")
  )

  const docs = await chat("open my google doc")
  ok(
    "docs is honest",
    docs.status === 200 &&
      (has(docs.body, "Connect Google") ||
        has(docs.body, "Doc") ||
        has(docs.body, "share")),
    docs.body.slice(0, 160).replace(/\s+/g, " ")
  )

  const sendMail = await chat("send an email to test@example.com subject: hi")
  ok(
    "gmail send is honest",
    sendMail.status === 200 &&
      !has(sendMail.body, "Sent mail") &&
      (has(sendMail.body, "Connect Google") ||
        (Boolean(sendMail.confirm && has(sendMail.confirm, "google_gmail")) &&
          has(sendMail.body, "Allow"))),
    sendMail.body.slice(0, 180).replace(/\s+/g, " ")
  )

  const pyAsk = await chat("Run python: print(sum(range(10)))")
  ok(
    "python asks first",
    pyAsk.status === 200 &&
      Boolean(pyAsk.confirm && has(pyAsk.confirm, "python")) &&
      !/\b45\b/.test(pyAsk.body),
    pyAsk.body.slice(0, 180).replace(/\s+/g, " ")
  )

  let pyPending = []
  try {
    pyPending = JSON.parse(pyAsk.confirm || "[]")
  } catch {
    pyPending = []
  }
  const pyRun = await chat("Run python: print(sum(range(10)))", {
    approved: pyPending.map((item) => ({ name: item.name, args: item.args })),
  })
  ok(
    "python allow-once prints 45",
    pyRun.status === 200 && has(pyRun.body, "45"),
    pyRun.body.slice(0, 220).replace(/\s+/g, " ")
  )

  const weather = await chat("weather in Hyderabad")
  ok("weather 200", weather.status === 200, `mode ${weather.mode} ${weather.ms}ms`)
  ok(
    "weather is live or honest, not a silent guess",
    weather.status === 200 &&
      (has(weather.body, "wttr") ||
        has(weather.body, "°C") ||
        has(weather.body, "Hyderabad") ||
        has(weather.body, "Weather lookup failed")),
    weather.body.slice(0, 220).replace(/\s+/g, " ")
  )

  const news = await chat("what's the news")
  ok("news 200", news.status === 200, `mode ${news.mode} ${news.ms}ms`)
  ok(
    "news uses the news tool",
    news.status === 200 && has(news.tools || "", "news"),
    news.tools || news.body.slice(0, 120)
  )
  ok(
    "news is live or honest, not invented",
    news.status === 200 &&
      (has(news.body, "Live headlines") ||
        has(news.body, "Google News") ||
        has(news.body, "headline") ||
        has(news.body, "News lookup failed") ||
        has(news.body, "No headlines")),
    news.body.slice(0, 220).replace(/\s+/g, " ")
  )
  const localNews = await chat("news in Hyderabad")
  ok(
    "local news names Hyderabad or is honest",
    localNews.status === 200 &&
      (has(localNews.body, "Hyderabad") ||
        has(localNews.body, "Live headlines") ||
        has(localNews.body, "News lookup failed")),
    localNews.body.slice(0, 200).replace(/\s+/g, " ")
  )

  const otaku = await chat("where can I watch Frieren legally")
  ok("otaku 200", otaku.status === 200, `mode ${otaku.mode} ${otaku.ms}ms`)
  ok(
    "otaku uses the otaku tool",
    otaku.status === 200 && has(otaku.tools || "", "otaku"),
    otaku.tools || otaku.body.slice(0, 120)
  )
  ok(
    "otaku gives official links, not pirate rips",
    otaku.status === 200 &&
      (has(otaku.body, "AniList") ||
        has(otaku.body, "Crunchyroll") ||
        has(otaku.body, "anilist.co")) &&
      !has(otaku.body, "gogoanime") &&
      !has(otaku.body, "9anime") &&
      !has(otaku.body, "kissanime"),
    otaku.body.slice(0, 220).replace(/\s+/g, " ")
  )
  const mihon = await chat("tachiyomi mihon repository")
  ok(
    "mihon guide names official Mihon, not pirate repos",
    mihon.status === 200 &&
      has(mihon.body, "mihon") &&
      has(mihon.body, "github.com/mihonapp") &&
      !has(mihon.body, "keiyoushi") &&
      !has(mihon.body, "tachiyomi-extensions"),
    mihon.body.slice(0, 240).replace(/\s+/g, " ")
  )

  const otakuMix = await chat(
    "I'm an otaku. Where can I read Frieren and watch the anime legally? Also explain Mihon vs Tachiyomi."
  )
  ok(
    "otaku mixed ask still finds Frieren",
    otakuMix.status === 200 &&
      has(otakuMix.body, "Frieren") &&
      (has(otakuMix.body, "AniList") || has(otakuMix.body, "anilist")),
    otakuMix.body.slice(0, 200).replace(/\s+/g, " ")
  )

  const maps = await chat("directions to Charminar")
  ok("maps 200", maps.status === 200)
  ok(
    "maps includes a Maps link",
    has(maps.body, "google.com/maps") || has(maps.body, "openstreetmap"),
    maps.body.slice(0, 220).replace(/\s+/g, " ")
  )
  const takeMe = await chat("take me to Charminar")
  ok(
    "take me includes a Google Maps directions link",
    takeMe.status === 200 && has(takeMe.body, "google.com/maps/dir"),
    takeMe.body.slice(0, 220).replace(/\s+/g, " ")
  )
  const takeThere = await chat("take me there", {
    history: [
      { role: "user", content: "directions to Charminar" },
      {
        role: "assistant",
        content:
          "Google Maps: https://www.google.com/maps/dir/?api=1&destination=Charminar",
      },
    ],
  })
  ok(
    "take me there reuses the last place",
    takeThere.status === 200 &&
      has(takeThere.body, "Charminar") &&
      has(takeThere.body, "google.com/maps"),
    takeThere.body.slice(0, 220).replace(/\s+/g, " ")
  )

  const percent = await chat("Calculate 15% of 80")
  ok(
    "calc 15% of 80 is 12, no Python confirm",
    percent.status === 200 &&
      has(percent.body, "12") &&
      has(percent.tools || "", "calc") &&
      !percent.confirm,
    percent.body.slice(0, 180).replace(/\s+/g, " ")
  )
  const times = await chat("what's 7 * 8")
  ok(
    "calc 7*8 is 56",
    times.status === 200 && has(times.body, "56") && has(times.tools || "", "calc"),
    times.body.slice(0, 160).replace(/\s+/g, " ")
  )

  const song = await chat("Play tum hi ho on YouTube")
  ok(
    "music returns a YouTube link",
    song.status === 200 &&
      has(song.tools || "", "music") &&
      (has(song.body, "youtube.com") || has(song.body, "youtu.be")),
    song.body.slice(0, 220).replace(/\s+/g, " ")
  )

  const joke = await chat("tell me a one-line joke")
  ok(
    "joke is not a connect-Google dump",
    joke.status === 200 && !has(joke.body, "Connect Google") && joke.body.length > 20,
    joke.body.slice(0, 180).replace(/\s+/g, " ")
  )

  const connect = await req("/api/google/connect?json=1")
  ok(
    "connect without client is 400",
    connect.response.status === 400 && has(connect.raw, "OAuth"),
    connect.raw.slice(0, 160)
  )

  const saveBad = await req("/api/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: "x" }),
  })
  ok("save client needs secret", saveBad.response.status === 400)

  const saBad = await req("/api/google/service-account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "service_account" }),
  })
  ok("service account rejects incomplete key", saBad.response.status === 400)

  const fileName = `smoke-${Date.now()}.txt`
  const saved = await req("/api/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: fileName, text: "hello from smoke" }),
  })
  ok("files POST", saved.response.ok, saved.raw.slice(0, 120))
  const listed = await req("/api/files")
  ok(
    "files GET lists the smoke file",
    listed.response.ok && has(listed.raw, fileName),
    listed.raw.slice(0, 200)
  )

  const readFile = await chat(`read the file ${fileName}`)
  ok(
    "files_read returns the smoke text",
    readFile.status === 200 && has(readFile.body, "hello from smoke"),
    readFile.body.slice(0, 200).replace(/\s+/g, " ")
  )

  const writeAsk = await chat("save this as note-smoke.txt: keep the lamp lit")
  ok(
    "file write asks first",
    writeAsk.status === 200 &&
      Boolean(writeAsk.confirm && has(writeAsk.confirm, "files_write")),
    writeAsk.body.slice(0, 180).replace(/\s+/g, " ")
  )

  const speakEmpty = await req("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "" }),
  })
  ok("speak empty is 400", speakEmpty.response.status === 400)

  const lookup = await req("/api/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "weather in Hyderabad" }),
  })
  ok("lookup POST", lookup.response.ok, `status ${lookup.response.status}`)

  const lesson = await chat("Teach me flute. I am a beginner.")
  ok(
    "flute lesson",
    lesson.status === 200 && has(lesson.body, "bansuri") && has(lesson.tools || "", "flute"),
    lesson.body.slice(0, 160).replace(/\s+/g, " ")
  )
  const twinkle = await chat("notes for Twinkle Twinkle")
  ok(
    "flute twinkle sargam",
    twinkle.status === 200 && has(twinkle.body, "Sa Sa Pa Pa"),
    twinkle.body.slice(0, 160).replace(/\s+/g, " ")
  )
  const kinds = await chat("kinds of flute")
  ok(
    "flute kinds",
    kinds.status === 200 && has(kinds.body, "Bansuri") && has(kinds.body, "Concert"),
    kinds.body.slice(0, 160).replace(/\s+/g, " ")
  )
  const fluteClip = await chat("notes for this clip")
  ok(
    "flute clip pitches",
    fluteClip.status === 200 &&
      (has(fluteClip.body, "Sa(G4)") || has(fluteClip.body, "No audio")),
    fluteClip.body.slice(0, 180).replace(/\s+/g, " ")
  )

  console.log("")
  console.log(`${results.length - failed}/${results.length} passed`)
  if (failed) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
