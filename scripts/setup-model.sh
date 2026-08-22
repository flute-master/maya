#!/usr/bin/env bash
# Install Maya's local model (Ollama + llama3.2, then a named "maya" model).
# Run from the project folder on WSL or Linux.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-llama3.2}"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Installing Ollama…"
  curl -fsSL https://ollama.com/install.sh | sh
fi

echo "Pulling ${BASE}…"
ollama pull "$BASE"

if [[ -f "$ROOT/Modelfile" ]]; then
  echo "Building the named Maya model from Modelfile…"
  ollama create maya -f "$ROOT/Modelfile"
fi

echo
echo "Maya's offline brain is downloaded (one-time)."
echo "Load it and use it (linked, one command):"
echo "  npm run brain:use"
echo "  open http://127.0.0.1:43217"
echo "  then http://127.0.0.1:43217/brain"
echo
echo "Ever-learning is memory + optional tiny net, not retraining Llama."
echo "Walkthrough: BRAIN.md"
echo "Bake notes later: Customize → Lookup → Download Modelfile, then"
echo "  ollama create maya -f Modelfile"
