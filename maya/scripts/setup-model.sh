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
echo "Maya's brain is ready. From the project folder:"
echo "  OLLAMA_MODEL=maya npm run dev"
echo
echo "She uses this local model to talk. World facts still get a web lookup when needed."
echo "To bake in your Memory notes later: Customize → Lookup → Download Modelfile, then"
echo "  ollama create maya -f Modelfile"
