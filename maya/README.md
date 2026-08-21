# Maya

A text-first inner sage who lives on your machine. Analysis, loyalty, a voice that stays. She learns from what you tell her (memory on disk), talks with a **free local model**, and looks the web up only when a fact needs it. No paid APIs.

**Deploy (computer, phone PWA, optional tunnel):** see [DEPLOY.md](./DEPLOY.md).

This is **not** Raphael / Great Sage from *That Time I Got Reincarnated as a Slime*. That performance cannot be cloned. The clips are an original Indian-English inner-sage register.

## Clone and test (your computer)

Need **Node.js 20+** and **Chrome or Edge**. Unmute the browser tab.

```bash
git clone https://github.com/flute-master/maya.git
cd maya/maya
npm install
npm run dev
```

Open **http://127.0.0.1:43217**

Hear the clips first: **http://127.0.0.1:43217/hear.html** — press play on Inner sage.

If you do not have the GitHub repo yet, open **http://127.0.0.1:43217/download.html** and use **Download maya.zip**. Unzip it, then `cd` into that folder and run `npm install` and `npm run dev` the same way.

### Put this on your GitHub (empty repo)

1. Open https://github.com/new
2. Repository name: `maya`
3. Public
4. **Do not** add a README, .gitignore, or license (this project already has them)
5. Create repository
6. In the unzipped (or cloned Origin) folder:

```bash
git remote add github https://github.com/flute-master/maya.git
git push -u github main
```

GitHub will ask you to sign in. Use a **Personal Access Token** as the password, not your GitHub account password. (GitHub → Settings → Developer settings → Personal access tokens → `repo` scope.)

After the first push, later updates are:

```bash
cd maya
git pull
```

### Hear the clips first

Open **http://127.0.0.1:43217/hear.html**

Press play on **Inner sage**. That page is only audio players and downloads. No chat.

Direct files (right-click → Save if you want them on disk):

- http://127.0.0.1:43217/clips/sage.mp3
- http://127.0.0.1:43217/clips/ananya.mp3
- http://127.0.0.1:43217/clips/diya.mp3
- http://127.0.0.1:43217/clips/meera.mp3
- http://127.0.0.1:43217/clips/kavya.mp3
- http://127.0.0.1:43217/clips/isha.mp3
- http://127.0.0.1:43217/clips/simran.mp3

On the main app, the light **Maya's voice** bar under the chat is the same sage clip. Use the browser’s play triangle on that bar.

### Test chat (she speaks replies by default)

1. Open http://127.0.0.1:43217
2. Send something like: `Who are you to me?`
3. She answers in text, then reads the reply aloud. The transcript still leads and follows along.
4. If you want silence, press **Text only**. The speaker on her message, or `speak that`, still voices that one line.
5. Typos are fine. `weathere in hyderbad` is treated as weather in Hyderabad. Your bubble stays as you typed it.

### Optional: same voice as the clips for live replies

Recorded clips always work. Live “speak this reply” uses the same Indian-English voice **if** Python can run `edge-tts`:

```bash
pip install -r requirements-voice.txt
```

Windows: `python` or `py` on PATH. macOS/Linux: `python3`. `ffmpeg` is optional (she still speaks without it).

If Python/`edge-tts` is missing, she falls back to your computer’s speech engine. On Windows, **Heera** (Settings → Time & language → Speech) is the usual Indian English woman’s voice. Live speech now uses Microsoft’s **Neerja Expressive** voice at a conversational pace — not the slowed, pitch-shifted reading.

### Optional: talk into the mic

Chrome or Edge. Click the mic, allow the site, speak, then send. Words appear as text first. Safari often cannot listen.

### Memory

She stores herself automatically. Chat, notes, and how she talks are written to this browser **and** to `data/maya-memory.json` in the project folder. You do not export for her to remember. Refresh does not reset her. **New** archives a thread; it does not erase her.

Customize → Memory → **Spare copy** is only if you want a backup or to take her to another computer. Import that file there.

If you ask “what are my skills?” she only answers from what you stored. Tell her, or write it under Customize → Memory. She will not invent a CV, and she will not Google your private life.

### Lookup (DuckDuckGo, Wikipedia, Google link)

Customize → Lookup. Off = fully offline. On = she searches when a **world** question needs an answer, or when you paste a page URL.

- Ask `what is …` / `who is …`, or say **look this up** / **google**.
- If search returns nothing, she gives you a **Google link** to open yourself.
- She does **not** drive Chrome, click around Google, or browse as you.

### Your local model (this is the brain)

Maya talks with a real local LLM via [Ollama](https://ollama.com), not the tiny built-in phrase engine. The repo includes a `Modelfile` that bakes her inner-sage instructions onto `llama3.2`. That is your Maya on this machine. Training a new neural net from scratch is a different (GPU-farm) project.

```bash
# from the project folder (WSL / Linux)
bash scripts/setup-model.sh
OLLAMA_MODEL=maya npm run dev
```

Windows without WSL: install Ollama from the site, then in the project folder run `ollama pull llama3.2` and `ollama create maya -f Modelfile`.

If `http://127.0.0.1:11434` is up, she uses **maya**. If a world fact is missing, she looks it up (DuckDuckGo + Wikipedia) and answers again. Personal facts stay in Memory — she will not Google your life.

To bake **your** notes into the model: Customize → Lookup → **Download Modelfile**, then `ollama create maya -f Modelfile`.

If Ollama is not running, she falls back to the built-in engine so the app still opens. She should never answer with only “parsing.”

## What she can do from chat

- **Stories, jokes, puns, satire** — ask. The local model writes them when it’s running; otherwise she still has a built-in writer.
- **Weather** — `weather in Hyderabad`. Live from wttr.in, no API key.
- **Maps** — `directions to Charminar` or `map of Hitech City`. She drops Google Maps and OpenStreetMap links. She cannot log into your Google account or drive the Maps app.
- **Reminders and alarms** — `remind me in 10 minutes to drink water`, `set an alarm for 7`. They fire in this tab (notification + her voice) if Maya is open. A Google Calendar link is optional. She cannot set the phone Clock app or Gmail.
- **Tasks** — `add a task: buy milk`, `what's on my list`, `mark buy milk done`.

She does **not** get “all Google app access.” That needs your Google login. Links, yes. Inbox and Calendar takeover, no.

## How she works

- Enter sends, Shift+Enter is a new line.
- **Customize** shapes presence (inner sage / friend / companion), tone, and instructions.
- She **adapts** from how you write. Reset that under Customize → Lookup.
- **Customize → Voice** picks a writing style (Ananya, Diya, Meera, Kavya, Isha, Simran) and Hear this plays that clip.

## What this is not

A ChatGPT wrapper. Cloud sync. Celebrity or anime voice cloning.
