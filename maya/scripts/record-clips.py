#!/usr/bin/env python3
"""Rebuild public/clips with the expressive Indian-English voice at a conversational pace."""
import asyncio
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1] / "public" / "clips"

CLIPS = [
    (
        "sage.mp3",
        "-4%",
        "I am here, Master. Analysis first, then a proposal. I do not leave the post. Say the problem when you are ready.",
    ),
    (
        "ananya.mp3",
        "+2%",
        "Sit. Don't make it a presentation. Tell me the version you haven't said out loud yet — I'm not in a hurry.",
    ),
    (
        "diya.mp3",
        "+5%",
        "Okay, no speech. What's actually eating you? Say it like you'd say it in a cab at 11pm.",
    ),
    (
        "meera.mp3",
        "+0%",
        "I'll say it plainly. You already know. You want someone in the room while you admit it.",
    ),
    (
        "kavya.mp3",
        "+2%",
        "Let's not catastrophise, and also not pretend it's fine. What's the smallest true next step?",
    ),
    (
        "isha.mp3",
        "-2%",
        "We can go slowly. You don't have to make it a decision tonight. Say the part that feels unfinished.",
    ),
    (
        "simran.mp3",
        "+4%",
        "Come. You don't have to be impressive. Eat something, then talk. I'm not going anywhere.",
    ),
]

VOICES = ["en-IN-NeerjaExpressiveNeural", "en-IN-NeerjaNeural"]


async def render(name: str, rate: str, text: str) -> None:
    out = ROOT / name
    last_error: Exception | None = None
    for voice in VOICES:
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(str(out))
            print(f"wrote {out.name} ({voice}, {rate})")
            return
        except Exception as error:  # noqa: BLE001
            last_error = error
    raise last_error or RuntimeError(name)


async def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    for name, rate, text in CLIPS:
        await render(name, rate, text)


asyncio.run(main())
