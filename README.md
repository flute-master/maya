# Maya

A text-first inner sage who lives on your laptop. She remembers what you tell her, talks with a **free local model**, looks the web up only when a fact needs it, and runs tools you allow. No paid APIs.

This is **not** Raphael / Great Sage from *That Time I Got Reincarnated as a Slime*. That voice cannot be cloned. Maya uses an original Indian-English inner-sage register.

**Phone, WSL, firewall, and tunnel walkthrough:** [DEPLOY.md](./DEPLOY.md)

---

## Contents

1. [Run it](#run-it)
2. [How to read the screen](#how-to-read-the-screen)
3. [First ten minutes](#first-ten-minutes)
4. [Permissions](#permissions)
5. [Customize](#customize)
6. [Talk, listen, and voice](#talk-listen-and-voice)
7. [Memory, Mind, and plans](#memory-mind-and-plans)
8. [Calculator, maps, weather, news, music](#calculator-maps-weather-news-music)
9. [Files, Python, and screen stills](#files-python-and-screen-stills)
10. [Knowledge vault](#knowledge-vault)
11. [Otaku shelf and flute](#otaku-shelf-and-flute)
12. [Google apps](#google-apps)
13. [Load the brain, then use it](#load-the-brain-then-use-it)
14. [System, doctor, backup](#system-doctor-backup)
15. [What works offline](#what-works-offline)
16. [Phone](#phone)
17. [GitHub](#github)
18. [What this is not](#what-this-is-not)

---

## Run it

You need [Node.js 20+](https://nodejs.org) and Chrome or Edge. Unmute the tab.

The **app** and the **offline brain** are two pieces. Load the brain, then use the app — they are linked:

```bash
git clone https://github.com/flute-master/maya.git
cd maya
npm install
npm run brain        # once: download ~2 GB, bake model `maya`
npm run brain:use    # every time: load that model and start the site
```

Open **http://127.0.0.1:43217** then the linked guide **http://127.0.0.1:43217/brain**

Full walkthrough (download → load → use correctly): [BRAIN.md](./BRAIN.md). A bare `npm run dev` starts the UI only; if Ollama is already up she will still pick `maya`, but **`npm run brain:use` is the path that loads and uses the brain together**.

You should see `package.json` in that folder. There is no extra `maya/maya`.

Hard-refresh after an update: **Ctrl+Shift+R**.

With the server running, `npm run smoke` checks chat, Google tools, files, weather, and maps.

### Later

```bash
cd maya
git pull
npm install
```

If an old clone still has an inner `maya/` folder, `git pull` from the directory that contains `.git`, then work where `package.json` is. You can delete the leftover inner folder (usually stale `node_modules`).

---

## How to read the screen

Most chrome is a **logo or icon**. Hover it for the name. A screen reader reads the same name.

### Header (top right)

| Mark | What it does |
| --- | --- |
| Calculator | Opens the local calculator sheet. Instant, no Python confirm |
| YouTube play button | Opens the music sheet. Search a song or play what chat found |
| Loop / refresh | **New chat.** Archives this thread. Memory stays |
| Sliders | **Customize** (rooms, voice, memory, permissions, system) |
| Star (Maya mark) | Identity. The word **Maya** sits next to it |

Status pills next to her name are also icons: offline, lookup, local model, sage tools.

### Empty starters (the tile grid)

Each tile is a logo. Hover for the label, then click to send that prompt.

Remember · Analyze · Plan · Story · Weather · News · Manga · Mihon · Python · Calendar · Skills · Flute · Maps · Calc · Music

### Composer (bottom)

| Mark | What it does |
| --- | --- |
| Speaker / muted speaker | Spoken replies on (default) or **text only** |
| Square (while she is speaking) | Stop voice |
| Microphone | Speak to her (Chrome/Edge). Browser will ask for the mic |
| Paperclip | Attach a file into `data/workspace` (text, images, short audio) |
| Monitor | Capture a **screen still**. Browser prompt. She cannot see pixels without a vision model |
| Up arrow | Send. Disabled until there is text. **Enter** sends, **Shift+Enter** is a new line |

### Customize tabs (icon row)

| Mark | Tab |
| --- | --- |
| Flame | Presence — name, what she calls you, Sage Mode, room, bond |
| Mic | Voice — spoken replies, writing voice, accent |
| Brain | Memory — notes, facts, plans, shelf, conversations, export/import |
| Globe | Lookup — permissions, Google, train, Ollama, on-device brain |
| Dashboard | System — doctor, skills, audit |

Three color dots under her name (or on the empty screen) are the rooms: **Hearth** (warm), **Veil** (indigo), **Ink** (near-black). She will not change the room unless you pick.

When she needs a powerful tool, a message shows **Allow once**. That is Maya Core asking — the model cannot approve itself.

---

## First ten minutes

0. Brain already loaded? If not, [BRAIN.md](./BRAIN.md) steps 1–2, or `npm run brain` then `npm run brain:use`. In the app: **[/brain](http://127.0.0.1:43217/brain)**.
1. Open **http://127.0.0.1:43217**. Unmute the tab. Hard-refresh once.
2. Customize → Lookup: it should say **`maya` is ready**. That is how you know load worked.
3. Optional: [http://127.0.0.1:43217/hear.html](http://127.0.0.1:43217/hear.html) — play Inner sage.
4. Send `Who are you to me?` She answers in text, then reads it aloud.
5. Tell her something on purpose: `I live in Hyderabad. Evenings are for family.`
6. Ask `What do you remember about me?`
7. Try `weather in Hyderabad` and `calculate 15% of 240`.
8. Open Customize (sliders) if you want a different room or to turn Sage Mode off.

Typos are fine: `weathere in hyderbad` is weather in Hyderabad.

Refresh does not wipe her. **New chat** starts a fresh thread. Old threads stay under Customize → Memory.

---

## Permissions

The model never controls tools. Flow: you type → Maya Core plans → **permission engine** → skill → result → brain writes the reply.

You set trust in **Customize → Lookup** (globe). Browser permissions (mic, notifications, screen) are separate — the **site** asks those, not Maya.

### What Maya may do (this app)

| Capability | Default | How to change | Notes |
| --- | --- | --- | --- |
| Internet (weather, news, maps, music, web, otaku, Google) | **On** | Lookup → “Look up world facts” | Off = she asks before any network tool |
| File **reads** | Always on | — | Only `data/workspace` |
| File **writes** | **Ask first** | Lookup → “Always allow file writes” | Still only `data/workspace` |
| Python | **Ask first** | Lookup → “Always allow Python” | `python3 -I`, 8 second cap, no desktop control |
| Google **reads** (calendar list, Drive search, Docs/Sheets read, Gmail read) | Allowed once connected | Connect Google first | Gmail read needs **OAuth**, not a service account |
| Google **writes** (create event, add task) | **Ask first** | Lookup → “Always allow Google writes” | Calendar/Tasks only |
| Gmail **send** | **Always asks** | Cannot fully skip | Even if Google writes are always-allow |
| Screen still | Browser prompt every time | Allow in the Chrome/Edge dialog | Stored still. No vision model is faked |
| Shell / terminal on your machine | **Disabled** | Cannot enable | Not this app |

When she asks, click **Allow once** on that message. That grant is for that turn (or the current session for some tools).

### What the browser may ask

| Prompt | Why | If you deny |
| --- | --- | --- |
| Microphone | Composer mic | Type instead |
| Notifications | Reminders / alarms in this tab | She still stores them; you will not get an OS toast |
| Screen / window share | Monitor button | Use the paperclip and attach a screenshot |

Maya does **not** drive Chrome, move the mouse, or install software.

### Permission phrases in chat

```
What can you actually do on this machine?
What did you access today?
```

Customize → System also lists every tool and whether it is automatic, ask, or disabled.

---

## Customize

Open the sliders in the header.

### Presence (flame)

- **Her name** — default Maya.
- **What she calls you** — Sage default is **Master**. Change it if that is not the bond.
- **Sage Mode** — on by default. Assessment first, then the answer. She will not invent a gap-filling fact. Off = shorter, ordinary replies.
- **The room** — Hearth / Veil / Ink. You pick.
- **The bond** — Inner sage is the default mind: stays, analyzes, does not perform being your pal.
- Friend / Advisor / Companion sliders and presets — how she mixes.

### Voice (mic)

- **Spoken replies** — on by default. Same toggle as the composer speaker.
- Writing voice and accent (North India, Britain, Europe, US, Australia, and a few further Englishes). Original personas, not celebrities, not an anime character.
- Recorded Hear clips are Indian English. Other accents preview through this computer’s speech engine.
- Fine-tune tone, energy, traits, values, boundaries, extra instructions.

### Memory (brain)

- Counts of messages, notes, shelf titles, conversations.
- **Download** = spare JSON copy of the vault. **Upload** = import a file.
- “Something to remember” box — press Enter or Save.
- Structured facts (preference / fact / goal / mention) with a confidence score. Trash forgets that row.
- Open plans, otaku shelf, past conversations.

Disk copy: `data/maya-memory.json` in the project folder (gitignored). She also writes a browser copy. You do not need to export for her to remember.

### Lookup (globe)

Permissions, Google connect, train from chats, Ollama Modelfile, on-device brain, LAN URL for your phone.

### System (dashboard)

Brain name, skill count, permission table, doctor checks, recent access log. The model does not control this panel.

---

## Talk, listen, and voice

**Type** in the box. Enter sends. Type `refresh` (or `clear` / `new chat`) to wipe the current thread. Memory stays.

**Speak:** tap the microphone, allow the site, talk, tap the square or Send. Chrome or Edge. Firefox is weaker here.

**Spoken replies** are on by default. After her line appears she reads it. The speaker on a message voices that line only. The composer speaker mutes future replies.

Better live speech on the laptop (optional):

```bash
pip install -r requirements-voice.txt
```

That uses `edge-tts` (free). If Python cannot run it, she uses the computer’s speech engine.

She will not use a copyrighted character voice.

---

## Memory, Mind, and plans

Three different stores:

| Store | What it is | Where |
| --- | --- | --- |
| Memory / vault | Chats, notes, prefs, shelf | `data/maya-memory.json` + browser |
| Mind facts | Structured “I know this about you” with confidence | Vault + SQLite `data/maya.db` |
| Knowledge | Your documents, not facts about you | `data/knowledge/` |

### Say these

```
I live in Hyderabad.
What do you remember about me?
Forget that I live in Hyderabad.
Analyze whether I should buy this laptop.
Plan my weekend.
Continue the plan.
What am I supposed to do today?
Remind me in 10 minutes to drink water.
Remind me tomorrow morning to call home.
```

**Mind rules she will not break**

- A mention in passing is not a settled fact.
- Analysis Chamber: objective → evidence → gaps → **WAIT**. She will not fabricate a BUY.
- Reminders fire in **this tab**, not the phone Clock app. Leave the tab open (or recently active). Allow notifications if you want an OS toast.
- Open reminders, tasks, and plans also show in the dock above the composer. The calendar mark on a reminder opens Google Calendar in the browser (a link, not a login).

---

## Calculator, maps, weather, news, music

These need the **internet** switch on (default), except the calculator.

### Calculator

Header calculator, or:

```
Calculate 15% of 240
7 * 8
```

Local. No Python confirm.

### Maps

```
Take me to Charminar
Way to Miyapur Metro
Directions to Charminar
Take me there
```

She **opens Google Maps in a new tab** as soon as she recognizes a place. Typo `Wafa Miyapur Metro` is treated as `way to Miyapur Metro`. She does not drive Chrome or log into Google for maps. If a popup is blocked, use the Maps mark under her reply.

### Weather

```
What's the weather in Hyderabad right now?
weather in Hyderabad
```

Live from wttr.in. If lookup fails she says so.

### News

```
What's the news?
news in Hyderabad
national news
world news
news about elections
```

Live headlines (Google News RSS; BBC / The Hindu if Google is quiet). Local if she knows your city or you name one. She does not invent stories.

### Music

Header YouTube mark, or:

```
Play tum hi ho on YouTube
```

She **opens YouTube** in a new tab as soon as you name a song, then pins the video in her player when she can. `play tum hi ho`, `song kesariya`, or `gaana` all count. She cannot log into Spotify. She does not download the audio. If a popup is blocked, use the YouTube mark in the header.

---

## Files, Python, and screen stills

Sandbox root: **`data/workspace`**. Nothing outside that folder. 8 MB per attach.

### Paperclip (files)

1. Click the paperclip.
2. Pick `.txt`, `.md`, `.csv`, `.json`, `.py`, images, or short audio.
3. She saves it and can list / read it.

```
List your files.
Read hello.txt.
Write a file called note.txt that says hello.
```

Reads run automatically. **Writes ask first** unless you turned on always-allow.

### Python

```
Run python: print(sum(range(10)))
```

She asks first (unless always-allow). Expected print for that example: `45`.

Limits: `python3 -I`, 8 seconds, no network from the sandbox, no desktop control.

Calculator expressions do **not** go through this confirm.

### Monitor (screen)

1. Click the monitor.
2. Allow the browser capture prompt and pick a window.
3. She stores a still under `data/workspace`.

There is **no vision model** in this app. She will say she cannot see the pixels rather than invent what is on your screen. Inside an embedded preview, capture is often blocked — open Maya in its own tab, or attach a screenshot with the paperclip.

---

## Knowledge vault

Drop your own notes in **`data/knowledge/`** (markdown or text). She searches that folder **before** the internet.

This is documents (how you do things, project notes), not memory (facts about you).

No embeddings yet. Ordinary text search. Works offline. See `data/knowledge/README.md`.

---

## Otaku shelf and flute

### Manga, novels, anime

```
I'm reading Frieren chapter 12
Where can I read Frieren and watch the anime legally?
Novel links for Spice and Wolf
Any updates on my manga?
Tachiyomi or Mihon — how do I read manga on my phone?
```

Official catalog links only (AniList, Crunchyroll, Manga Plus, VIZ, BookWalker, …). She remembers the shelf under Customize → Memory.

Tachiyomi is dead. **Mihon** is the current reader: [github.com/mihonapp/mihon](https://github.com/mihonapp/mihon). She will not give pirate extension repos or scanlation / stream-rip URLs. Own files: Mihon Local, or Komga / Kavita.

### Flute

Works offline. Teaching tunes and ragas only — not a full copyrighted film score.

```
Teach me flute. I am a beginner.
Kinds of flute
Notes for Twinkle
```

Paperclip a short `.wav` / `.mp3` and say `notes for this clip`. She guesses Sa and prints sargam (best effort, not a studio score).

---

## Google apps

Google is **optional**. Weather, maps links, and news already work without a Google login.

Two ways to connect. You can use both.

| Method | What it can see | What it cannot |
| --- | --- | --- |
| **OAuth (“Connect Google”)** | Your personal Gmail, Calendar, Drive, Docs, Sheets, Tasks, Contacts — as you | Keep, Meet, Photos Library (not these APIs) |
| **Service account JSON** | Calendars and Drive/Docs/Sheets **you share with its email** | Personal Gmail, personal Contacts |

Tokens and keys stay in `data/google-*.json` on this machine (**gitignored**). Never commit a live private key. Never paste a personal access token into this README.

### A. OAuth — personal Gmail and Calendar (recommended)

You need a free Google Cloud project. You are the only test user.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project (free).
2. Enable these APIs (APIs & Services → Library):
   - Google Calendar API
   - Gmail API
   - Google Drive API
   - Google Docs API
   - Google Sheets API
   - Google Tasks API
   - People API (Contacts)
3. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: Maya (or anything)
   - Add **your Gmail** under Test users
   - Publishing status can stay **Testing**
4. **Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URI — paste **exactly**:

   ```
   http://127.0.0.1:43217/api/google/callback
   ```

   If you open Maya as `http://localhost:43217`, add that callback too. The URI in Customize → Lookup is the one Maya is actually using.
5. Copy the **Client ID** and **Client secret**.
6. In Maya: **Customize → Lookup**.
   - Paste client ID and secret.
   - Click **Save client** (outline button).
   - Click the **Google G** to Connect. Sign in as the test user. Allow the scopes.
7. The app marks should light up: Gmail, Calendar, Drive, Docs, Sheets, Tasks, Contacts.

You can also put the same values in a local `.env` (never commit it):

```
GOOGLE_CLIENT_ID=….apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=…
```

`.env.example` shows the shape.

If a tool says an API is disabled, go back to the Cloud project and enable that API. If sign-in says redirect mismatch, the callback URI in Cloud must match the one Maya prints.

**Disconnect** is in the same panel after you are connected.

### B. Service account — shared Calendar / Drive only

Use this when you want Maya to read a calendar or folder **without** signing in as you. A service account is a robot user with its own email, like `maya@your-project.iam.gserviceaccount.com`.

It **cannot** open personal Gmail. For inbox and Contacts you still need OAuth (section A).

1. Same Google Cloud project (or a new one).
2. Enable **Calendar, Drive, Docs, Sheets, Tasks** (Gmail enable is useless for a service account).
3. **IAM & Admin → Service accounts → Create service account**
   - Name: `maya`
   - Skip extra roles unless your org requires them.
4. Open that service account → **Keys → Add key → Create new key → JSON**.
5. The browser downloads a JSON file. That file is a **private key**.
   - Either upload it in Customize → Lookup (“Service account JSON”), or
   - Copy it to `data/google-service-account.json` in the project folder.
6. `google-service-account.example.json` shows the **shape** only. Do not put a real `private_key` in git.
7. **Share the actual data with the robot email** (this step is the one people skip):
   - Google Calendar → Settings → the calendar → Share with `maya@….iam.gserviceaccount.com` → permission **See all event details** (or Make changes if you want her to create events).
   - Google Drive → right-click the folder or file → Share → same email → Viewer (or Editor for writes you later allow).
   - Docs and Sheets: share the document the same way.
8. Ask in chat:

   ```
   What's on my Google Calendar today?
   Search Drive for notes
   Open my Google Doc
   Google sheets
   ```

If you have **both** OAuth and a service account, OAuth wins for Gmail and Contacts. Shared calendars/Drive can still come from the service account when OAuth is not connected.

### C. What to say after you are connected

```
What's on my Google Calendar today?
Unread email
Search Drive for notes
Open my Google Doc
Google sheets
What's on my Google Tasks?
Look up Alice in my contacts
Create a calendar event tomorrow 3pm called Maya review
Send an email to me that says hello
```

**Writes** (create event, add task) ask first unless “Always allow Google writes” is on.

**Send mail** always asks, even then.

She will not invent events or an inbox. If she is not connected she tells you to open Customize → Lookup.

### D. What Google this is not

- Not “Maya opens Chrome and clicks Calendar.”
- Not Google Keep, Meet, or Photos Library.
- Not a way to skip sharing a calendar with the service-account email.
- Not something you should put on a public Vercel URL with a real client secret.

---

## Load the brain, then use it

Download, load, and everyday use are **one path**. They used to read as two unconnected pages — they are not.

**Linked guide:** [BRAIN.md](./BRAIN.md) · in the app: **[/brain](http://127.0.0.1:43217/brain)**

You do **not** train Llama from your chats. The smart offline talker is a **one-time download**. Then you **load** it each session. Then you **use** her in the tab.

```bash
npm run brain        # 1. download llama3.2 once, bake model `maya`
npm run brain:use    # 2. load that model and start the site
# 3. open http://127.0.0.1:43217  and  /brain
```

`npm run brain:load` only checks the model is there. Customize → Lookup must say `maya` is ready. Same panel: **Install offline brain** if step 1 never ran.

WSL if Windows Ollama is the host:

```bash
export OLLAMA_URL=http://127.0.0.1:11434
npm run brain:use
```

**Three brains in Lookup — do not mix them up**

| Which | Role |
| --- | --- |
| Ollama `maya` | The smart laptop talker. Steps above. |
| On-device | Phone / Ollama off. Lookup → **Load on-device brain** (Chrome/Edge, ~0.9 GB once). |
| Tiny net | Optional extra. Lookup → **Train from chats**. `npm run brain:train`. Not Llama. |

**Prefer order:** tools (weather, maps, YouTube, …) → tiny trained net (plain talk only) → Ollama `maya` → built-in engine.

---

## System, doctor, backup

Customize → System, or the CLI:

```bash
npm run doctor    # offline diagnostics (Ollama, files, Google key present or not)
npm test          # permissions + path policy
npm run eval      # honesty harness
npm run smoke     # live server feature slice (needs npm run dev)
npm run backup    # db + knowledge + vault — does not copy Google keys
npm run restore   # reverse of backup
npm run mcp       # Cursor MCP server (no shell; Python still asks)
```

MCP for Cursor: `.cursor/mcp.json` runs `npx tsx mcp/server/index.ts`. The model still does not get a shell.

Ask in chat: `What did you access today?`

---

## What works offline

Without Ollama and without the network she still: talks (built-in engine), remembers, plans, calculates, teaches flute, reads/writes the sandbox (writes ask), and runs Python you allow.

Weather, news, maps, music, web lookup, and Google need the net — she says so instead of inventing.

Knowledge search in `data/knowledge/` is offline.

---

## Phone

Same Wi‑Fi as the laptop. In Customize → Lookup, copy a LAN URL such as `http://192.168.1.12:43217`. Do not use `127.0.0.1` on the phone.

Then Add to Home Screen. Full WSL portproxy, firewall, and Cloudflare tunnel steps: [DEPLOY.md](./DEPLOY.md).

Reminders still need that page open. The phone Clock app is not connected.

---

## GitHub

The project already lives at **https://github.com/flute-master/maya**. You do not create an empty repo and upload a zip.

| You want to… | Do this |
| --- | --- |
| Run Maya | Clone, `cd maya`, `npm run dev` |
| Get updates | `cd maya` then `git pull` |
| Keep your own copy | [Fork](https://github.com/flute-master/maya/fork), then clone **your** fork |

A fork is the right way to put it on another GitHub account. Do not create a blank repo, do not paste a personal access token into a README, and do not drag folders into “Add file → Upload.”

### Do not commit

`data/maya-memory.json`, `data/maya.db`, `data/google-*.json`, `data/maya-gpt.pt`, workspace uploads, train logs, live service-account keys, `.env`.

---

## What this is not

A ChatGPT wrapper. Cloud sync. Celebrity or anime voice cloning. A Play Store app. Desktop click-automation. A pirate manga client. A way to train Llama-scale weights from your chats.

She will not take over your mouse. She will not invent a CV or a calendar.
