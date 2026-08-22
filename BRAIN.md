# Load Maya’s brain, then use it

Download and load are **not** the same as talking to her. They are two steps on **one path**. Do them in order.

In the running app this same guide is **[http://127.0.0.1:43217/brain](http://127.0.0.1:43217/brain)**. Feature list (maps, Google, flute): [README.md](./README.md) — those pages assume this brain is already loaded.

A laptop cannot grow a ChatGPT-sized model from your chats. The smart offline talker is a **downloaded** open model (Llama 3.2) baked as **`maya`**. Ever-learning is memory plus an optional tiny net.

---

## The path (linked)

| Step | When | Command | What it does |
| --- | --- | --- | --- |
| **1. Download** | Once per machine | `npm run brain` | Installs Ollama if needed, pulls llama3.2 (~2 GB), creates model `maya` |
| **2. Load** | Every session | `npm run brain:use` | Checks `maya`, then **starts Maya with that model** |
| **3. Use** | In the browser | open `/` then hard-refresh | Talk. Confirm Lookup says `maya` is ready |

`npm run brain:load` is step 2 **without** starting the site (check only).

Do not download in one window and then run a bare `npm run dev` in another unless Ollama is already up. Load and use stay on this path.

---

## Step 1 — Download (once)

From the folder that has `package.json`:

```bash
npm install
npm run brain
```

That script:

1. Installs [Ollama](https://ollama.com) if `ollama` is missing (Linux/WSL).
2. Downloads **llama3.2** once.
3. Builds the named model **`maya`** from `Modelfile` (her voice and rules).

On **Windows without WSL**, install the [Ollama app](https://ollama.com) first, then in PowerShell:

```bat
cd maya
ollama pull llama3.2
ollama create maya -f Modelfile
```

Or, if Git Bash is on PATH: `npm run brain`.

---

## Step 2 — Load (every time you open Maya)

1. Start **Ollama** (the app, or `ollama serve`).
2. From the project folder:

   ```bash
   npm run brain:use
   ```

   That checks `maya` exists (downloads it if you skipped step 1), then starts the site **with this brain**.

   Check only:

   ```bash
   npm run brain:load
   ```

3. Open **http://127.0.0.1:43217**
4. Open the linked use guide: **http://127.0.0.1:43217/brain**
5. Hard-refresh once: **Ctrl+Shift+R**

### WSL talking to Windows Ollama

If Customize says Ollama is down but the Windows Ollama app is open:

```bash
export OLLAMA_URL=http://127.0.0.1:11434
npm run brain:use
```

Windows Ollama: allow LAN / localhost. Recent WSL usually forwards `127.0.0.1`.

---

## Step 3 — Use it correctly

These checks are how you know the load actually stuck. Features in the README will not “turn the brain on” by themselves.

1. Customize → Lookup (globe). It must say **`maya` is ready** (or `maya:latest`). Same panel: **Install offline brain** only if step 1 never ran.
2. Send `Who are you to me?`  
   The header badge is a CPU / sparkle mark when the local model or sage tools ran — not a cloud API.
3. Talk normally. Typos are fine (`weathere in hyderbad`, `another onw` after a joke).
4. Weather, maps, and songs still open **tools first**. That is correct. The brain writes the reply around what the tool found.
5. Memory is how she learns you. Facts land in `data/maya-memory.json`. Refresh does not wipe her. **New chat** only starts a fresh thread.

Prove the weights from a terminal:

```bash
ollama list
# you should see llama3.2 and maya
ollama run maya "Say one sentence as Maya."
```

`npm run doctor` prints whether the local model is visible.

---

## Three brains — linked, not mixed

They sit in the same Lookup panel. They are **not** three copies of the same download.

| Which | When to use it | How you turn it on |
| --- | --- | --- |
| **Ollama `maya`** | Laptop, smart offline talk | Steps 1–2. This is the one you want. |
| **On-device** | Phone, or Ollama off | Customize → Lookup → **Load on-device brain**. Chrome/Edge, ~0.9 GB once, then that browser is offline. |
| **Tiny net** | Optional extra on small talk | Lookup → **Train from chats**, leave **Use trained net** on. `npm run brain:train`. It will not become Llama. |

Prefer order when she answers: tools (weather, maps, YouTube, …) → tiny trained net (plain talk only, if you trained it) → **`maya` on Ollama** → built-in engine.

### Ever-learning (after the download)

The big weights stay downloaded. She still gets smarter about *you*:

| What | How | Offline? |
| --- | --- | --- |
| Memory | Talk. Facts land in `data/maya-memory.json`. | Yes |
| Knowledge | Drop notes in `data/knowledge/` | Yes |
| Re-bake `maya` | Lookup → **Download Modelfile** (includes your notes), then `ollama create maya -f Modelfile` | Needs Ollama |
| Tiny net | Lookup → **Train from chats**, or `npm run brain:train` | Yes (laptop CPU, ~2 min) |

```bash
pip install -r requirements-train.txt
npm run brain:train
```

Checkpoint files stay on this machine and are **gitignored** (`data/maya-gpt.pt`). Do not commit them.

---

## Phone

Laptop can stay the Ollama host on the same Wi‑Fi (LAN URL from Customize → Lookup).

Or, in **Chrome or Edge** on the phone:

1. Open Maya.
2. Customize → Lookup → **Load on-device brain** (or the brain mark on the empty screen).
3. Wait out the first download (~0.9 GB). After that it is cached and works offline in **that browser**.

iPhone Safari usually cannot (no WebGPU). Use the laptop URL instead.

---

## If it fails

| Symptom | Fix |
| --- | --- |
| `ollama: command not found` | Install [Ollama](https://ollama.com), then `npm run brain` again |
| Pull is slow | Normal the first time. ~2 GB. Keep the laptop awake |
| `maya` missing after pull | `ollama create maya -f Modelfile` from the project folder |
| Site up, replies thin / “parsing” | Ollama not running, or you never loaded. `ollama serve` then `npm run brain:use` |
| Lookup does not say `maya` | You downloaded but did not load. Stay on this file / `/brain`. README feature pages will not load the model. |
| WSL cannot see Ollama | `export OLLAMA_URL=http://127.0.0.1:11434` |
| Train from chats fails | `pip install -r requirements-train.txt` — needs a few GB of RAM |
| On-device button missing | Chrome/Edge + WebGPU. Not Safari on many iPhones |

---

## What this is not

- Not a Llama trained from your chat log
- Not a paid OpenAI / Gemini key
- Not something you zip and upload to GitHub (the weights stay in Ollama’s store)
- Not a cloud sync of memory
- Not a substitute for the feature guide — [README.md](./README.md) is how to *use the app* after this brain is loaded. Trigger words: [Keyword triggers](./README.md#keyword-triggers).

The download lives in Ollama’s library on **this computer**. Another machine needs its own `npm run brain`.
