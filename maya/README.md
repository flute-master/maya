# Maya

A text-first inner sage who lives on your machine. Analysis, loyalty, a voice that stays. She learns your shape from how you actually talk.

She does **not** call an external language model. Chat is offline. The only network use is optional web lookup when a fact needs searching.

This is **not** Raphael / Great Sage from *That Time I Got Reincarnated as a Slime*. That performance cannot be cloned. The clips are an original Indian-English inner-sage register.

## Clone and test (your computer)

Need **Node.js 20+** and **Chrome or Edge**. Unmute the browser tab.

```bash
git clone https://github.com/flute-master/maya.git
cd maya
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

### Test chat (text is the default)

1. Open http://127.0.0.1:43217
2. Leave **Spoken replies** off.
3. Send something like: `Who are you to me?`
4. She answers in text. She should not speak unless you ask.
5. Tap the speaker on her message, or type `speak that`, if you want that line voiced.
6. Optional: turn **Spoken replies** on to hear each reply. The transcript still leads.

### Optional: same voice as the clips for live replies

Recorded clips always work. Live “speak this reply” uses the same Indian-English voice **if** Python can run `edge-tts`:

```bash
pip install -r requirements-voice.txt
```

Windows: `python` or `py` on PATH. macOS/Linux: `python3`. `ffmpeg` is optional (she still speaks without it).

If Python/`edge-tts` is missing, she falls back to your computer’s speech engine. On Windows, **Heera** (Settings → Time & language → Speech) is the usual Indian English woman’s voice.

### Optional: talk into the mic

Chrome or Edge. Click the mic, allow the site, speak, then send. Words appear as text first. Safari often cannot listen.

### Memory

Refresh does not reset her. **Export** downloads `maya-memory.json`. Import that file on another machine to take the same Maya with you. **New** archives a thread; it does not erase her.

### Search

Customize → Search. Off = fully offline. On = she may look up a fact and will say so.

## How she works

- Enter sends, Shift+Enter is a new line.
- **Customize** shapes presence (inner sage / friend / companion), tone, and instructions.
- She **adapts** from how you write. Reset that under Customize → Search.
- **Customize → Voice** picks a writing style (Ananya, Diya, Meera, Kavya, Isha, Simran) and Hear this plays that clip.

## What this is not

A ChatGPT wrapper. Cloud sync. Celebrity or anime voice cloning.
