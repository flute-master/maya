#!/usr/bin/env python3
"""Train Maya's tiny GPT from random weights on seed dialogues + your chats."""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import torch

from corpus import build, tokenize
from gpt import MayaGPT

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CKPT = DATA / "maya-gpt.pt"
META = DATA / "maya-gpt-meta.json"
STATUS = DATA / "train-status.json"


def write_status(**kwargs) -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    payload = {"updatedAt": time.time(), **kwargs}
    STATUS.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--steps", type=int, default=1200)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--block", type=int, default=96)
    parser.add_argument("--n-embd", type=int, default=192)
    parser.add_argument("--n-head", type=int, default=6)
    parser.add_argument("--n-layer", type=int, default=6)
    parser.add_argument("--lr", type=float, default=3e-4)
    args = parser.parse_args()

    write_status(running=True, step=0, steps=args.steps, loss=None, ready=False, error=None)
    corpus_path = build()
    raw = corpus_path.read_text(encoding="utf-8")
    tokens = tokenize(raw)
    vocab = sorted(set(tokens))
    stoi = {tok: i for i, tok in enumerate(vocab)}
    itos = {i: tok for tok, i in stoi.items()}
    ids = torch.tensor([stoi[tok] for tok in tokens], dtype=torch.long)
    if ids.numel() < args.block + 2:
        raise SystemExit("Corpus too small. Chat more, then train again.")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = MayaGPT(
        vocab_size=len(vocab),
        n_embd=args.n_embd,
        n_head=args.n_head,
        n_layer=args.n_layer,
        block_size=args.block,
        dropout=0.1,
    ).to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr)

    def batch():
        ix = torch.randint(0, ids.numel() - args.block - 1, (args.batch,))
        x = torch.stack([ids[i : i + args.block] for i in ix])
        y = torch.stack([ids[i + 1 : i + 1 + args.block] for i in ix])
        return x.to(device), y.to(device)

    model.train()
    t0 = time.time()
    last_loss = None
    for step in range(1, args.steps + 1):
        x, y = batch()
        _, loss = model(x, y)
        opt.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()
        last_loss = float(loss.item())
        if step == 1 or step % 25 == 0 or step == args.steps:
            write_status(
                running=True,
                step=step,
                steps=args.steps,
                loss=round(last_loss, 4),
                ready=False,
                device=str(device),
                tokens=int(ids.numel()),
                vocab=len(vocab),
                elapsed=round(time.time() - t0, 1),
            )
            print(f"step {step}/{args.steps} loss {last_loss:.4f}", flush=True)

    ckpt = {
        "model": model.state_dict(),
        "config": {
            "vocab_size": len(vocab),
            "n_embd": args.n_embd,
            "n_head": args.n_head,
            "n_layer": args.n_layer,
            "block_size": args.block,
            "dropout": 0.1,
        },
        "stoi": stoi,
        "itos": {str(k): v for k, v in itos.items()},
    }
    DATA.mkdir(parents=True, exist_ok=True)
    torch.save(ckpt, CKPT)
    META.write_text(
        json.dumps(
            {
                "trainedAt": time.time(),
                "steps": args.steps,
                "loss": last_loss,
                "vocab": len(vocab),
                "tokens": int(ids.numel()),
                "device": str(device),
                "params": sum(p.numel() for p in model.parameters()),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    write_status(
        running=False,
        step=args.steps,
        steps=args.steps,
        loss=round(last_loss or 0, 4),
        ready=True,
        device=str(device),
        checkpoint=str(CKPT.relative_to(ROOT)),
        elapsed=round(time.time() - t0, 1),
    )
    print(f"saved {CKPT}", flush=True)


if __name__ == "__main__":
    random.seed(42)
    torch.manual_seed(42)
    try:
        main()
    except Exception as err:
        write_status(running=False, ready=False, error=str(err))
        raise
