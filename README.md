# Maya

A text-first inner sage who lives on your laptop. She remembers what you tell her, talks with a **free local model**, looks the web up only when a fact needs it, and can run tools you allow (files, Python, weather, reminders). No paid APIs.

This is **not** Raphael / Great Sage from *That Time I Got Reincarnated as a Slime*. That voice cannot be cloned. Maya uses an original Indian-English inner-sage register.

**Phone and firewall walkthrough:** [DEPLOY.md](./DEPLOY.md)

---

## Run it

You need [Node.js 20+](https://nodejs.org) and Chrome or Edge. Unmute the tab.

```bash
git clone https://github.com/flute-master/maya.git
cd maya
npm install
npm run dev
```

Open **http://127.0.0.1:43217**

You should see `package.json` in that `maya` folder. There is no extra `maya/maya`.

Hear her first: **http://127.0.0.1:43217/hear.html** — press play on Inner sage.

Send `Who are you to me?` She answers in text, then reads it aloud. **Text only** in the composer mutes that. Typos are fine: `weathere in hyderbad` is weather in Hyderabad.

### Later

```bash
cd maya
git pull
npm install
```

If an old clone still has an inner `maya/` folder, `git pull` from the directory that contains `.git`, then work where `package.json` is. You can delete the leftover inner folder (usually stale `node_modules`).

---

## GitHub

The project already lives at **https://github.com/flute-master/maya**. You do not create an empty repo and upload a zip.

| You want to… | Do this |
| --- | --- |
| Run Maya | Clone, `cd maya`, `npm run dev` (above) |
| Get updates | `cd maya` then `git pull` |
| Keep your own copy | [Fork](https://github.com/flute-master/maya/fork) on GitHub, then clone **your** fork |

A fork is the right way to put it on another GitHub account. Do not create a blank repo, do not paste a personal access token into a README, and do not drag folders into “Add file → Upload.”

---

## What she can do

Ask in chat, or use the paperclip / monitor / mic on the composer.

- **Talk** — text, mic (Chrome/Edge), spoken replies on by default
- **Remember** — notes and chats on this machine (`data/maya-memory.json`). Refresh does not wipe her. **New** archives a thread; it does not erase memory
- **Look up** — DuckDuckGo, Wikipedia, public GitHub. If search fails she gives you a Google link. She does not drive Chrome
- **Weather** — `weather in Hyderabad` (live from wttr.in)
- **Maps** — `directions to Charminar` (links only; no Google login)
- **Reminders** — `remind me in 10 minutes to drink water`. They fire in this tab, not the phone Clock app
- **Stories / jokes / puns** — ask
- **Python** — `Run python: print(sum(range(10)))`. She asks first. Sandbox is `data/workspace`
- **Files** — paperclip drops a file into that sandbox. Monitor saves a screen still (she cannot see pixels without a vision model)

Customize → Lookup lists what is live, partial, or not this app.

She does **not** get Gmail, Calendar takeover, or your desktop mouse. That would be a different kind of program.

---

## Brain

Two layers. You do not need to train Llama from zero.

1. **Existing model (best)** — install [Ollama](https://ollama.com), then from this folder:

   ```bash
   ollama pull llama3.2
   ollama create maya -f Modelfile
   ```

   If `http://127.0.0.1:11434` is up, she uses **maya**. Customize → Lookup → Download Modelfile bakes your notes into that model.

2. **Small net you train** — random weights, laptop CPU, about two minutes:

   ```bash
   pip install -r requirements-train.txt
   python3 train/train.py
   ```

   Customize → Lookup → **Train from chats**. It will not become Llama. A giant model from zero is still a GPU-farm project.

If neither is running, she still answers with the built-in engine. On a phone, **Load on-device brain** (Chrome/Edge, ~0.9 GB once) is the fallback.

---

## Voice

Spoken replies are on by default. Recorded clips always work.

Live speech uses the same Indian-English voice if Python can run `edge-tts`:

```bash
pip install -r requirements-voice.txt
```

Otherwise she uses the computer’s speech engine (on Windows, Heera is the usual Indian English voice). Customize → Voice picks writing style (Ananya, Diya, Meera, Kavya, Isha, Simran).

---

## Phone

Same Wi‑Fi as the laptop, open the LAN URL Maya prints, then Add to Home Screen. Full steps (WSL portproxy, firewall, tunnel): [DEPLOY.md](./DEPLOY.md).

---

## What this is not

A ChatGPT wrapper. Cloud sync. Celebrity or anime voice cloning. A Play Store app. Desktop click-automation.
