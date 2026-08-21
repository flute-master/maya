# Deploy Maya — laptop and phone

Maya is a **website you run**, not an App Store / Play Store app. The laptop runs the site. The phone opens that site and can **Add to Home Screen** so it behaves like an app.

No paid APIs. No Google login.

| Device | How you open her | Who answers |
| --- | --- | --- |
| Laptop | Browser at `http://127.0.0.1:43217` | Sage tools + Ollama / trained tiny GPT |
| Phone, same Wi‑Fi | Laptop’s LAN URL, then Add to Home Screen | Laptop’s Ollama, **or** an on-device model in Chrome |
| Phone, away from home | Cloudflare tunnel URL | Laptop must stay on, **or** on-device model already loaded |

The app lives at the **root** of https://github.com/flute-master/maya. After `git clone` you `cd maya` once — the folder Git created — and you should see `package.json`. There is no inner `maya/maya`.

---

## 0. What you need

### Laptop

- **Git**
- **Node.js 20 or newer** — https://nodejs.org (LTS)
- **Chrome or Edge** (Firefox works for text; voice and the on-device model prefer Chrome/Edge)
- **Ollama** — https://ollama.com (smarter backup brain)
- **Python 3** — for the from-scratch trainer (`pip install -r requirements-train.txt`) and optional spoken voice (`pip install -r requirements-voice.txt`)

### Phone

- **Android:** Chrome
- **iPhone:** Safari (home screen), Chrome if you have it (on-device model needs WebGPU; many iPhones cannot load it)

The phone does **not** install Node or Ollama.

---

## 1. Laptop — Windows with WSL (your current setup)

This is the path if Maya already lives at something like:

`/mnt/c/Users/Bobba.ruthvik/maya`

### 1.1 One-time install

In **Ubuntu / WSL**:

```bash
sudo apt update
sudo apt install -y git curl python3 python3-pip

# Node 20 if `node -v` is missing or below 20
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # must print v20 or v22
```

Clone (skip if you already have the folder):

```bash
cd /mnt/c/Users/Bobba.ruthvik
git clone https://github.com/flute-master/maya.git
cd maya
```

If you already cloned the old nested layout (`maya/maya`):

```bash
cd /mnt/c/Users/Bobba.ruthvik/maya
git pull
```

The app is now in this folder (`package.json` here). If a leftover inner `maya/` directory remains, it is usually old `node_modules` — you can delete that inner folder.

Install and start:

```bash
npm install
bash scripts/setup-model.sh
pip install -r requirements-voice.txt
OLLAMA_MODEL=maya npm run dev
```

Leave that terminal running.

### 1.2 Open on the laptop

On Windows, open **Chrome or Edge**:

**http://127.0.0.1:43217**

You should see Maya. Send `Who are you to me?`

Checks:

- Refresh — the chat is still there.
- Customize → Lookup — it should say the local model is live (`maya` or `llama3.2`).
- Optional: Customize → Voice — Spoken replies on.

Memory file on disk: `data/maya-memory.json` in the project folder. Do not commit that file.

### 1.3 Keep her running after you close the terminal

Dev mode (`npm run dev`) dies when you close WSL. For a longer-running laptop copy:

```bash
cd /mnt/c/Users/Bobba.ruthvik/maya
npm install
npm run build
OLLAMA_MODEL=maya npm start
```

`npm start` still needs that terminal (or a background job) and Ollama running.

Make Ollama start with Windows: install Ollama from https://ollama.com — the Windows app keeps `http://127.0.0.1:11434` up. WSL can talk to it via localhost.

If WSL cannot see Ollama:

```bash
export OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=maya npm run dev
```

Windows Ollama: Settings → expose / allow LAN if you need WSL to reach it. On recent WSL, `localhost` forwarding is usually enough.

### 1.4 Update later

```bash
cd /mnt/c/Users/Bobba.ruthvik/maya
git pull
npm install
# only if Modelfile changed:
ollama create maya -f Modelfile
OLLAMA_MODEL=maya npm run dev
```

---

## 2. Laptop — Windows without WSL

1. Install [Node.js LTS](https://nodejs.org), [Git](https://git-scm.com), [Ollama](https://ollama.com).
2. Open **PowerShell** or **Git Bash**:

```bat
git clone https://github.com/flute-master/maya.git
cd maya
npm install
ollama pull llama3.2
ollama create maya -f Modelfile
set OLLAMA_MODEL=maya
npm run dev
```

3. Open **http://127.0.0.1:43217**

Voice:

```bat
pip install -r requirements-voice.txt
```

This path is **easier for the phone**, because the server is already on the Windows Wi‑Fi address. Prefer it if WSL LAN is fighting you.

---

## 3. Laptop — macOS or Linux

```bash
git clone https://github.com/flute-master/maya.git
cd maya
npm install
bash scripts/setup-model.sh
pip3 install -r requirements-voice.txt
OLLAMA_MODEL=maya npm run dev
```

Open **http://127.0.0.1:43217**

macOS: install Node with https://nodejs.org or `brew install node`. Ollama from https://ollama.com.

---

## 4. Phone on the same Wi‑Fi

The laptop must be running Maya (`npm run dev` or `npm start`). Both devices on the **same Wi‑Fi** (not phone cellular, not a guest network that blocks device-to-device).

### 4.1 Get the URL

On the laptop, open Maya → **Customize → Lookup**. Copy a line under **Open on your phone**, like:

`http://192.168.1.12:43217`

That is IPv4. Do not use `127.0.0.1` on the phone — that means the phone itself.

If the list is empty, find the laptop Wi‑Fi IP:

- Windows (cmd): `ipconfig` → Wireless LAN adapter → **IPv4 Address**
- macOS: System Settings → Wi‑Fi → Details → IP
- Linux: `ip -4 addr` or `hostname -I`

Then type `http://THAT_IP:43217` on the phone.

### 4.2 Android

1. Open **Chrome** (not Instagram in-app browser, not Samsung Internet if WebGPU fails).
2. Go to the LAN URL. Allow the connection if Chrome warns about “not secure” — this is local HTTP, expected.
3. Menu (⋮) → **Add to Home screen** / **Install app**.
4. Open the new **Maya** icon. It should hide the browser chrome.
5. First visit: tap **Load on-device brain** if you want the phone to answer with the laptop off. ~0.9 GB, once, Wi‑Fi. Chrome with WebGPU (most Android 12+ flagships).
6. When she asks, allow **microphone** (talk) and **notifications** (reminders).

Spoken replies use the phone’s speech engine if the laptop voice API is not reachable.

### 4.3 iPhone / iPad

1. Open **Safari** (required for Add to Home Screen).
2. Go to the LAN URL.
3. Share → **Add to Home Screen**.
4. Open the icon.

Limits on iPhone:

- Mic / live listen often **does not** work.
- **Load on-device brain** often **fails** (no WebGPU). Use the laptop’s Ollama over Wi‑Fi instead.
- Reminders only fire if the PWA is open.

### 4.4 Windows Firewall (almost always needed)

If the phone spins and never loads:

1. Windows Security → Firewall → Allow an app → allow **Node.js** on **Private** networks.
2. Or an inbound rule: TCP **43217**, private profile.

WSL2 extra (phone cannot see WSL even if Windows browser works):

WSL has its own virtual IP. Phones talk to **Windows**, not that virtual IP.

In **PowerShell as Administrator**, once per reboot (replace `172.x.x.x` with `hostname -I` from WSL):

```powershell
netsh interface portproxy add v4tov4 listenport=43217 listenaddress=0.0.0.0 connectport=43217 connectaddress=172.x.x.x
netsh advfirewall firewall add rule name="Maya 43217" dir=in action=allow protocol=TCP localport=43217
```

Check the WSL IP:

```bash
hostname -I
```

Windows 11 **mirrored networking** (`.wslconfig` → `networkingMode=mirrored`) also works and skips portproxy.

Simplest fix if this is painful: run Maya with **Windows Node** (section 2) instead of WSL.

### 4.5 What the phone can do

Works:

- Chat, memory in **that browser** (plus laptop disk memory when you use the laptop URL)
- Weather, maps links, web lookup (needs internet)
- Home screen icon
- On-device brain after you load it (Android Chrome)

Needs the laptop process:

- Ollama-quality answers, unless the on-device model is loaded
- Saving to `data/maya-memory.json` (that file lives on the laptop)

Does not:

- Set the phone Clock app or Gmail
- Stay running for alarms if you swipe the PWA away (reminders need the page open or recently active)

---

## 5. Phone away from home (still free)

Laptop stays on at home, Maya running.

Install Cloudflare’s free tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/

```bash
cloudflared tunnel --url http://127.0.0.1:43217
```

It prints `https://something.trycloudflare.com`. Open that on the phone. Add to Home Screen.

The laptop must stay awake. For a phone that works in a bus with no laptop: load the **on-device brain** once at home (Android Chrome), then the model is cached in that browser.

---

## 6. Optional: put the UI on Vercel (free)

```bash
cd maya
npx vercel
```

This hosts the **front end** only. There is **no Ollama on Vercel**. On the phone/laptop that opens the Vercel URL, tap **Load on-device brain**. Memory stays in that browser. Lookup still works.

Do not add OpenAI / Gemini keys.

---

## 7. After deploy — checklist

Laptop:

- [ ] `http://127.0.0.1:43217` loads
- [ ] Customize → Lookup shows a local model name
- [ ] Refresh keeps the chat
- [ ] `weather in Hyderabad` returns live weather
- [ ] `remind me in 1 minute to stretch` pings in that tab

Phone (same Wi‑Fi):

- [ ] LAN URL loads (not `127.0.0.1`)
- [ ] Add to Home Screen opens standalone
- [ ] A message gets an answer
- [ ] Android: Load on-device brain finishes (optional)

---

## 8. If it breaks

| Symptom | Fix |
| --- | --- |
| `cd maya` then nothing / no `package.json` | You are inside an extra folder from the old nested layout. Go up until you see `package.json`, or clone again |
| `The application path is not writable` | Do not run create-next-app on `/`. This repo is already scaffolded. |
| Site loads, answers are thin / “parsing” | No trained checkpoint and Ollama not running. Train from chats, or `ollama serve` then `ollama create maya -f Modelfile` |
| Train from chats fails | `pip install -r requirements-train.txt` then `python3 train/train.py`. Needs a few GB of RAM |
| `EADDRINUSE :43217` | Something already serves Maya. Use that, or `kill` the old Node process |
| Phone never loads | Same Wi‑Fi, Windows firewall, WSL portproxy, use the **Wi‑Fi IPv4**, not 127.0.0.1 |
| Voice is robotic | `pip install -r requirements-voice.txt` on the laptop; unmute the tab |
| On-device brain button missing / fails | Need Chrome/Edge + WebGPU. iPhone Safari usually cannot. Use laptop Ollama over Wi‑Fi |
| Memory vanished on the phone | Phone browser storage is separate from the laptop file. Use the laptop URL, or Customize → Memory → Spare copy / Import |

---

## 9. What you are not deploying

- Not a Play Store / App Store binary
- Not a Llama-scale model trained from random weights (that is still a GPU-farm project)
- You **are** deploying a **small** transformer you can train on the laptop: Customize → Lookup → Train from chats, or `python3 train/train.py`
- You **are** deploying a sage core (tools, files, Python sandbox, vector recall). Not desktop click-automation
- Not a Google account integration
- Not a public server unless you add the Cloudflare tunnel or Vercel yourself
