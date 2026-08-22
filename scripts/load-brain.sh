#!/usr/bin/env bash
# Check that the offline Maya model is present, then print how to load it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama is not installed. Install https://ollama.com then run: npm run brain"
  exit 1
fi

if ! curl -fsS --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  echo "Ollama is installed but not running. Open the Ollama app, or run: ollama serve"
  echo "Then run this again: npm run brain:load"
  exit 1
fi

if ! ollama list 2>/dev/null | grep -qiE '^maya([:[:space:]]|$)'; then
  echo "Model maya is not on this machine yet. Downloading once…"
  bash "$ROOT/scripts/setup-model.sh"
fi

echo
echo "Offline brain is loaded in Ollama as: maya"
echo
echo "Start Maya with it:"
echo "  OLLAMA_MODEL=maya npm run dev"
echo
echo "Then open http://127.0.0.1:43217 and hard-refresh (Ctrl+Shift+R)."
echo "Customize → Lookup should say maya is ready."
echo
echo "Full walkthrough: BRAIN.md"
