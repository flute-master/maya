#!/usr/bin/env bash
# Install a real local model for Maya (Ollama). Run from WSL or Linux.
set -euo pipefail

if ! command -v ollama >/dev/null 2>&1; then
  echo "Installing Ollama…"
  curl -fsSL https://ollama.com/install.sh | sh
fi

MODEL="${1:-llama3.2}"
echo "Pulling ${MODEL} (this is the brain Maya will use)…"
ollama pull "$MODEL"

echo
echo "Done. Restart Maya from the project folder:"
echo "  OLLAMA_MODEL=${MODEL} npm run dev"
echo
echo "Optional — bake her personality + your memory into a custom model:"
echo "  Customize → Lookup → Download Modelfile"
echo "  ollama create maya -f Modelfile"
echo "  OLLAMA_MODEL=maya npm run dev"
