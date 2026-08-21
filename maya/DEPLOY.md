# Deploy Maya (free)

No paid APIs. Offline she talks with a local model. Online she can look facts up (DuckDuckGo / Wikipedia). Memory saves itself on the device.

## What “smart / ever-learning” means here

She does **not** retrain neural weights on your laptop (that needs a GPU farm). She **does** keep growing a memory file from what you tell her, inject it into every reply, and use the strongest **free local** model you can run:

| Place | Brain (free) | After first setup |
| --- | --- | --- |
| PC / WSL | Ollama model `maya` (llama3.2) | Fully offline |
| Phone / tablet | In-browser WebLLM (Llama 3.2 1B, ~0.9 GB once) | Offline in that browser |
| Online | Same brain + web lookup | Needs internet only for facts |

## 1. Computer (best quality)

Need **Node 20+**, **Chrome or Edge**.

```bash
git clone https://github.com/flute-master/maya.git
cd maya/maya
npm install
bash scripts/setup-model.sh
OLLAMA_MODEL=maya npm run dev
```

Open **http://127.0.0.1:43217**

`setup-model.sh` installs Ollama if needed and builds the named `maya` model. First chat can take a few seconds.

## 2. Phone on the same Wi‑Fi (PWA)

Keep the computer running. Bind is `0.0.0.0`, so the phone can reach it.

1. Customize → Lookup — copy the **LAN URL** (example `http://192.168.1.12:43217`).
2. Phone on the **same Wi‑Fi**. Open that URL in **Chrome (Android)** or **Safari (iPhone)**.
3. Android: Chrome menu → **Add to Home screen**.
4. iPhone: Share → **Add to Home Screen**.
5. Optional: **Load on-device brain** so the phone can answer if the PC is off (downloads ~0.9 GB once, then works offline in that browser).

Windows Firewall: allow Node on private networks if the phone cannot connect.

## 3. Away from home (still free)

Use a tunnel so you do not pay for an API:

```bash
# one-time: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
cloudflared tunnel --url http://127.0.0.1:43217
```

Open the `https://….trycloudflare.com` link on the phone. Bookmark / Add to Home Screen.

The PC must stay on for Ollama. For a phone-only brain, load the on-device model in step 2 first.

## 4. Optional: Vercel (UI only, still free)

```bash
npx vercel
```

This hosts the site. There is **no Ollama on Vercel**. Use **Load on-device brain** in the browser. Memory stays in that phone/laptop (browser + downloadable spare copy). Lookup still works when the site can reach DuckDuckGo/Wikipedia.

Do not add OpenAI / Anthropic / Gemini keys. Maya is built to refuse paid APIs.

## Checks after deploy

- Refresh the page — chat is still there (`data/maya-memory.json` on the PC).
- Turn the phone to airplane mode after the on-device model is loaded — she still talks.
- Turn networking on — “what is the capital of India?” should look the fact up.
- Home screen icon opens as a standalone app (PWA).
