#!/usr/bin/env python3
import asyncio
import sys

import edge_tts

voice, rate, pitch, out = sys.argv[1:5]
text = sys.stdin.read()
if not text.strip():
    sys.exit(1)


async def main() -> None:
    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(out)


asyncio.run(main())
