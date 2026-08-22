#!/usr/bin/env python3
"""Estimate a note list from a short audio clip. Best-effort, not a studio transcriber."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
SARGAM = {
    0: "Sa",
    1: "re",
    2: "Re",
    3: "ga",
    4: "Ga",
    5: "ma",
    6: "Ma",
    7: "Pa",
    8: "dha",
    9: "Dha",
    10: "ni",
    11: "Ni",
}


def hz_to_midi(hz: float) -> float:
    return 69 + 12 * np.log2(hz / 440.0)


def midi_label(midi: float, sa_midi: float) -> tuple[str, str]:
    n = int(round(midi))
    name = f"{NOTE_NAMES[n % 12]}{n // 12 - 1}"
    deg = (n - int(round(sa_midi))) % 12
    return name, SARGAM[deg]


def load_mono(path: Path, sr: int = 22050, seconds: float = 20) -> np.ndarray:
    raw = path.read_bytes()[: 12]
    if raw.startswith(b"RIFF"):
        import wave

        with wave.open(str(path), "rb") as wav:
            rate = wav.getframerate()
            frames = wav.readframes(min(wav.getnframes(), int(seconds * rate)))
            width = wav.getsampwidth()
            ch = wav.getnchannels()
            if width == 2:
                data = np.frombuffer(frames, dtype="<i2").astype(np.float32)
            else:
                data = np.frombuffer(frames, dtype=np.uint8).astype(np.float32) - 128
            if ch > 1:
                data = data.reshape(-1, ch).mean(axis=1)
            if rate != sr:
                n = int(len(data) * sr / rate)
                data = np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(data)), data)
            return data / (np.max(np.abs(data)) + 1e-9)
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(path),
            "-ac",
            "1",
            "-ar",
            str(sr),
            "-t",
            str(seconds),
            "-f",
            "wav",
            tmp.name,
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return load_mono(Path(tmp.name), sr, seconds)


def fft_hz(frame: np.ndarray, sr: int, fmin: float = 220, fmax: float = 1046) -> float | None:
    if np.max(np.abs(frame)) < 0.04:
        return None
    frame = frame - np.mean(frame)
    window = np.hanning(len(frame))
    spec = np.abs(np.fft.rfft(frame * window))
    freqs = np.fft.rfftfreq(len(frame), 1 / sr)
    band = (freqs >= fmin) & (freqs <= fmax)
    if not np.any(band):
        return None
    peak_i = int(np.argmax(spec[band]))
    hz = float(freqs[band][peak_i])
    # Prefer the lowest strong peak (fundamental) over a louder harmonic.
    fund_band = (freqs >= fmin) & (freqs <= hz * 0.6 + fmin)
    if np.any(fund_band):
        local = spec[fund_band]
        if local.max() > spec[band][peak_i] * 0.45:
            hz = float(freqs[fund_band][int(np.argmax(local))])
    return hz


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Need an audio path."}))
        sys.exit(1)
    path = Path(sys.argv[1])
    sr = 22050
    audio = load_mono(path, sr)
    hop = 1024
    win = 4096
    pitches: list[float] = []
    for start in range(0, max(0, len(audio) - win), hop):
        chunk = audio[start : start + win]
        if float(np.max(np.abs(chunk))) < 0.08:
            continue
        hz = fft_hz(chunk, sr)
        if hz:
            pitches.append(hz)
    if len(pitches) < 4:
        print(json.dumps({"error": "Could not hear a stable pitch. Play closer, less noise, or send a WAV."}))
        return
    midis = np.array([hz_to_midi(h) for h in pitches])
    # median filter, then keep a pitch only if neighbours agree
    smooth = midis.copy()
    for i in range(1, len(midis) - 1):
        smooth[i] = np.median(midis[i - 1 : i + 2])
    stable: list[float] = []
    for i, m in enumerate(smooth):
        if i == 0 or abs(m - smooth[i - 1]) < 0.6:
            stable.append(float(np.round(m)))
    if len(stable) < 3:
        stable = [float(np.round(m)) for m in smooth]
    head = stable[: max(3, len(stable) // 4)]
    sa_pc = int(min(head)) % 12
    sa_midi = float(np.median(stable) - ((int(round(float(np.median(stable)))) - sa_pc) % 12))
    cleaned: list[str] = []
    last = None
    run = 0
    pending: str | None = None
    for m in stable:
        west, sargam = midi_label(float(m), sa_midi)
        token = f"{sargam}({west})"
        if token == pending:
            run += 1
        else:
            if pending and run >= 2 and pending != last:
                cleaned.append(pending)
                last = pending
            pending = token
            run = 1
    if pending and run >= 2 and pending != last:
        cleaned.append(pending)
    if not cleaned:
        cleaned = [midi_label(float(stable[0]), sa_midi)[1] + f"({midi_label(float(stable[0]), sa_midi)[0]})"]
    print(
        json.dumps(
            {
                "ok": True,
                "guessed_sa": NOTE_NAMES[sa_pc],
                "note_count": len(cleaned),
                "notes": cleaned[:48],
                "median_hz": round(float(np.median(pitches)), 1),
            }
        )
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as err:  # noqa: BLE001
        print(json.dumps({"error": str(err)[:300]}))
        sys.exit(1)
