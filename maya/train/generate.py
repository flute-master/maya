#!/usr/bin/env python3
"""Generate a Maya reply from the trained-from-scratch checkpoint."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import torch

from corpus import USER, MAYA, END, MEM, tokenize
from gpt import MayaGPT

ROOT = Path(__file__).resolve().parent.parent
CKPT = ROOT / "data" / "maya-gpt.pt"


def encode(text: str, stoi: dict[str, int]) -> list[int]:
    ids = []
    unk = stoi.get(" ")
    for tok in tokenize(text):
        if tok in stoi:
            ids.append(stoi[tok])
        elif unk is not None:
            ids.append(unk)
    return ids


def decode(ids: list[int], itos: dict[int, str]) -> str:
    return "".join(itos.get(i, "") for i in ids)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", default="")
    parser.add_argument("--max-tokens", type=int, default=90)
    parser.add_argument("--temperature", type=float, default=0.65)
    args = parser.parse_args()
    prompt = args.prompt or sys.stdin.read()
    if not CKPT.exists():
        sys.stderr.write("No checkpoint. Run: python3 train/train.py\n")
        sys.exit(2)

    pack = torch.load(CKPT, map_location="cpu", weights_only=False)
    cfg = pack["config"]
    stoi = pack["stoi"]
    itos = {int(k): v for k, v in pack["itos"].items()}
    model = MayaGPT(**cfg)
    model.load_state_dict(pack["model"])
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    stop_id = stoi.get(END)

    if MAYA not in prompt:
        prompt = prompt.rstrip() + f"\n{MAYA} "
    ids = encode(prompt, stoi)
    if not ids:
        ids = encode(f"{USER} hello\n{MAYA} ", stoi)
    idx = torch.tensor([ids], dtype=torch.long, device=device)
    out = model.generate(
        idx,
        max_new_tokens=args.max_tokens,
        temperature=args.temperature,
        top_k=20,
        stop_id=stop_id,
    )
    text = decode(out[0].tolist(), itos)
    if MAYA in text:
        text = text.split(MAYA)[-1]
    text = text.replace(END, "").replace(USER, "").replace(MEM, "").strip()
    print(text)


if __name__ == "__main__":
    main()
