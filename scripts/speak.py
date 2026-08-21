#!/usr/bin/env python3
"""Speak a line with Microsoft Edge neural TTS, preferring the expressive Indian-English voice."""
import asyncio
import sys

import edge_tts

voice, rate, pitch, out = sys.argv[1:5]
text = sys.stdin.read()
if not text.strip():
    sys.exit(1)

FALLBACKS = [
    voice,
    "en-IN-NeerjaExpressiveNeural",
    "en-IN-NeerjaNeural",
]


def clean(raw: str) -> str:
    import re

    spoken = raw.strip()
    spoken = re.sub(r"```[\s\S]*?```", " ", spoken)
    spoken = re.sub(r"`([^`]+)`", r"\1", spoken)
    spoken = re.sub(r"\*\*([^*]+)\*\*", r"\1", spoken)
    spoken = re.sub(r"\*([^*]+)\*", r"\1", spoken)
    spoken = re.sub(r"^#{1,6}\s+", "", spoken, flags=re.M)
    spoken = re.sub(r"^\s*[-•*]\s+", "", spoken, flags=re.M)
    spoken = re.sub(r"\[([^\]]+)\]\(https?://[^)]+\)", r"\1", spoken)
    spoken = re.sub(r"https?://\S+", "a link", spoken)
    spoken = re.sub(r"\n{2,}", ". ", spoken)
    spoken = re.sub(r"\n", ", ", spoken)
    spoken = re.sub(r"\s{2,}", " ", spoken)
    return spoken.strip()


async def save(spoken: str, chosen: str, use_rate: str, use_pitch: str) -> None:
    kwargs = {"rate": use_rate}
    if use_pitch and use_pitch not in {"+0Hz", "0Hz", "0"}:
        kwargs["pitch"] = use_pitch
    await edge_tts.Communicate(spoken, chosen, **kwargs).save(out)


async def main() -> None:
    spoken = clean(text)
    last_error: Exception | None = None
    for chosen in FALLBACKS:
        for use_pitch in (pitch, "+0Hz"):
            try:
                await save(spoken, chosen, rate, use_pitch)
                return
            except Exception as error:  # noqa: BLE001
                last_error = error
                continue
    if last_error:
        raise last_error
    sys.exit(1)


asyncio.run(main())
