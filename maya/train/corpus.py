"""Build a training corpus from seed dialogues + Maya's memory file."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEED = Path(__file__).resolve().parent / "seed.txt"
MEMORY = ROOT / "data" / "maya-memory.json"
OUT = ROOT / "data" / "train-corpus.txt"

USER = "<|user|>"
MAYA = "<|maya|>"
END = "<|end|>"
MEM = "<|mem|>"
SPECIALS = (USER, MAYA, END, MEM)


def tokenize(text: str) -> list[str]:
    tokens: list[str] = []
    buf: list[str] = []
    i = 0
    while i < len(text):
        hit = None
        for sp in SPECIALS:
            if text.startswith(sp, i):
                hit = sp
                break
        if hit:
            if buf:
                tokens.append("".join(buf))
                buf = []
            tokens.append(hit)
            i += len(hit)
            continue
        ch = text[i]
        if ch.isspace():
            if buf:
                tokens.append("".join(buf))
                buf = []
            tokens.append("\n" if ch == "\n" else " ")
            i += 1
            while i < len(text) and text[i] in " \t":
                i += 1
            continue
        if ch in ".,!?;:()[]{}\"":
            if buf:
                tokens.append("".join(buf))
                buf = []
            tokens.append(ch)
            i += 1
            continue
        buf.append(ch)
        i += 1
    if buf:
        tokens.append("".join(buf))
    return [tok for tok in tokens if tok != ""]


def _clean(text: str) -> str:
    return " ".join(text.replace("\r", " ").split())


def from_memory(path: Path) -> list[str]:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    notes = data.get("notes") or []
    mem_lines = [
        _clean(note.get("text") or "")
        for note in notes
        if isinstance(note, dict) and _clean(note.get("text") or "")
    ][:24]
    mem_block = ""
    if mem_lines:
        mem_block = MEM + " " + " | ".join(mem_lines)

    chunks: list[str] = []
    for convo in data.get("conversations") or []:
        messages = convo.get("messages") or []
        pairs: list[tuple[str, str]] = []
        pending = ""
        for message in messages:
            role = message.get("role")
            content = _clean(message.get("content") or "")
            if not content:
                continue
            if role == "user":
                pending = content
            elif role == "assistant" and pending:
                pairs.append((pending, content))
                pending = ""
        if not pairs:
            continue
        body = []
        if mem_block:
            body.append(mem_block)
        for user, maya in pairs[-8:]:
            body.append(f"{USER} {user}")
            body.append(f"{MAYA} {maya}")
        body.append(END)
        chunks.append("\n".join(body))
    return chunks


def from_seed(path: Path) -> list[str]:
    if not path.exists():
        return []
    raw = path.read_text(encoding="utf-8")
    parts = [part.strip() for part in raw.split("\n\n===\n\n") if part.strip()]
    out = []
    for part in parts:
        if USER not in part:
            continue
        chunk = part.strip()
        if not chunk.endswith(END):
            chunk = chunk + "\n" + END
        out.append(chunk)
    return out


def build() -> Path:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    chunks = from_seed(SEED) + from_memory(MEMORY)
    if not chunks:
        raise SystemExit("No training text. Add train/seed.txt or chat with Maya first.")
    # Repeat seed so the style does not get drowned by one long memory dump
    seed = from_seed(SEED)
    text = "\n\n".join(seed + chunks + seed)
    OUT.write_text(text, encoding="utf-8")
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"Wrote {path} ({path.stat().st_size} bytes)")
