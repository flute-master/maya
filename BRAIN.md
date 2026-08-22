# Maya’s offline brain

This is the **one-time download**. After it finishes she talks on your laptop with no paid API. Ever-learning is memory plus a small extra net — not training Llama from your chats.

A laptop cannot grow a ChatGPT-sized model from zero. The smart part is a **downloaded open model** (Llama 3.2). Maya’s personality is baked on top. Your facts live in `data/maya-memory.json` and grow every time you talk.

Full feature guide: [README.md](./README.md)

---

## What you download (once)

| Piece | Size (about) | What it is |
| --- | --- | --- |
| **Ollama + `llama3.2` → model `maya`** | ~2 GB | The smart offline talker. This is the one you want. |
| **On-device (Chrome/Edge)** | ~0.9–2 GB | Same family, stored in the browser. Use on a phone or when Ollama is off. |
| **Train from chats** | a few MB | Tiny transformer on *your* dialogues. Honest extra. It will not become Llama. |

Prefer order when she answers: tools (weather, maps, YouTube, …) → tiny trained net (only for plain talk, if you trained it) → **`maya` on Ollama** → built-in engine.

---

## Laptop — one command (Linux / WSL / macOS)

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

## How to load it

### Every time you open Maya

1. Start **Ollama** (the app, or `ollama serve`).
2. From the project folder:

   ```bash
   npm run brain:load
   ```

   That checks `maya` exists, then prints the run command. Or start her yourself:

   ```bash
   OLLAMA_MODEL=maya npm run dev
   ```

3. Open **http://127.0.0.1:43217**
4. Hard-refresh once: **Ctrl+Shift+R**
5. Look at Customize → Lookup (globe). It should say **`maya` is ready** (or `maya:latest`).

You can also click **Install offline brain** in that same panel if Ollama is already running.

### WSL talking to Windows Ollama

If Customize says Ollama is down but the Windows Ollama app is open:

```bash
export OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=maya npm run dev
```

Windows Ollama: allow LAN / localhost. Recent WSL usually forwards `127.0.0.1`.

### Prove it is the local model

Send `Who are you to me?`  
The header badge is a CPU / sparkle mark when the local model or sage tools ran — not a cloud API.

```bash
ollama list
# you should see llama3.2 and maya
ollama run maya "Say one sentence as Maya."
```

---

## Ever-learning (after the download)

The big model stays the downloaded weights. She still gets smarter about *you* without a GPU farm:

| What | How | Offline? |
| --- | --- | --- |
| Memory | Talk. Facts land in `data/maya-memory.json`. Refresh does not wipe her. | Yes |
| Knowledge | Drop notes in `data/knowledge/` | Yes |
| Re-bake `maya` | Customize → Lookup → **Download Modelfile** (includes your notes), then `ollama create maya -f Modelfile` | Needs Ollama |
| Tiny net | Customize → Lookup → **Train from chats**, or `npm run brain:train` | Yes (laptop CPU, ~2 min) |

Toggle **Use trained net** if you want the tiny checkpoint tried on small talk. Tools (maps, weather, songs) still skip it so answers stay honest.

```bash
pip install -r requirements-train.txt
npm run brain:train
```

Checkpoint files stay on this machine and are **gitignored** (`data/maya-gpt.pt`). Do not commit them.

---

## Phone — one-time browser download

Laptop can stay the Ollama host on the same Wi‑Fi (open the LAN URL from Customize → Lookup).

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
| Site up, replies thin / “parsing” | Ollama not running, or wrong folder. `ollama serve` then `OLLAMA_MODEL=maya npm run dev` |
| WSL cannot see Ollama | `export OLLAMA_URL=http://127.0.0.1:11434` |
| Train from chats fails | `pip install -r requirements-train.txt` — needs a few GB of RAM |
| On-device button missing | Chrome/Edge + WebGPU. Not Safari on many iPhones |

`npm run doctor` prints whether the local model is visible.

---

## What this is not

- Not a Llama trained from your chat log
- Not a paid OpenAI / Gemini key
- Not something you zip and upload to GitHub (the weights stay in Ollama’s store)
- Not a cloud sync of memory

The download lives in Ollama’s library on **this computer**. Another machine needs its own `npm run brain`.
