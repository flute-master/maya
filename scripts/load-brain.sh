#!/usr/bin/env bash
# Load Maya's offline model, then optionally start the app with it.
#   npm run brain:load          — check only
#   npm run brain:use           — load and start (linked to everyday use)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
START=0
if [[ "${1:-}" == "--start" ]]; then
  START=1
fi

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama is not installed. Install https://ollama.com then run: npm run brain"
  echo "Guide: BRAIN.md  (in the app: /brain)"
  exit 1
fi

if ! curl -fsS --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  echo "Ollama is installed but not running. Open the Ollama app, or run: ollama serve"
  echo "Then load and use: npm run brain:use"
  echo "Guide: BRAIN.md  (in the app: /brain)"
  exit 1
fi

if ! ollama list 2>/dev/null | grep -qiE '^maya([:[:space:]]|$)'; then
  echo "Model maya is not on this machine yet. Downloading once…"
  bash "$ROOT/scripts/setup-model.sh"
fi

echo
echo "Offline brain is loaded in Ollama as: maya"
echo
echo "Use it correctly:"
echo "  1. Open http://127.0.0.1:43217"
echo "  2. Hard-refresh (Ctrl+Shift+R)"
echo "  3. Customize → Lookup should say maya is ready"
echo "  4. Read the linked guide: http://127.0.0.1:43217/brain"
echo

if [[ "$START" -eq 1 ]]; then
  if curl -fsS --max-time 1 http://127.0.0.1:43217 >/dev/null 2>&1; then
    echo "Maya is already open on port 43217."
    echo "Hard-refresh the tab so it picks up this brain."
    echo "Guide: http://127.0.0.1:43217/brain"
    exit 0
  fi
  echo "Starting Maya with this brain…"
  exec env OLLAMA_MODEL=maya npm run dev
fi

echo "Start Maya with this brain (load + use, one command):"
echo "  npm run brain:use"
echo
echo "Full walkthrough: BRAIN.md"
