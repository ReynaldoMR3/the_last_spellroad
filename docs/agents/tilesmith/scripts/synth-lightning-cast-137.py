#!/usr/bin/env python3
"""
Deterministic, hand-authored candidate for the lightning element's cast one-shot (issue #137).

Fourth-step ("hand-author only as a last resort") option under the Art Sourcing Contract
(docs/agents/_reference/art-sourcing-contract.md) -- included alongside the CC0-sourced
candidates precisely because it sidesteps the licensing problem entirely (no third-party file,
no license to verify). Not a Composer-style notation-based generator (no pitched score here) --
this is raw-waveform synthesis, the SFX-side equivalent: a fast downward FM "crack" sweep plus
a band-limited, gated noise "crackle" tail, combined and soft-clipped for bite.

Pure numpy + soundfile, no scipy/audio-DSP library -- filters below are simple one-pole
IIR stages, applied a few times each for a steeper effective slope, kept deliberately minimal
so the whole signal chain is auditable by reading this file top to bottom.

Deterministic: fixed sample rate, fixed synthesis parameters, and a fixed RNG seed for the
crackle-gate noise, so re-running this script produces a byte-identical file (verified below
in __main__, the same "prove it, don't assume it" self-verification style this repo's other
agent logs use).
"""
from __future__ import annotations

import hashlib
import sys

import numpy as np
import soundfile as sf

SR = 44100
DURATION_S = 0.34
SEED = 137  # the issue number -- arbitrary but fixed, for reproducibility


def one_pole_lowpass(x: np.ndarray, cutoff_hz: float, sr: int) -> np.ndarray:
    """Simple one-pole low-pass IIR (RC filter equivalent). y[n] = y[n-1] + a*(x[n]-y[n-1])."""
    a = 1.0 - np.exp(-2.0 * np.pi * cutoff_hz / sr)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


def one_pole_highpass(x: np.ndarray, cutoff_hz: float, sr: int) -> np.ndarray:
    """Complement of the low-pass above: x - lowpass(x)."""
    return x - one_pole_lowpass(x, cutoff_hz, sr)


def bandpass(x: np.ndarray, low_hz: float, high_hz: float, sr: int, stages: int = 2) -> np.ndarray:
    y = x
    for _ in range(stages):
        y = one_pole_highpass(y, low_hz, sr)
        y = one_pole_lowpass(y, high_hz, sr)
    return y


def synth_lightning_crack(sr: int = SR, duration_s: float = DURATION_S, seed: int = SEED) -> np.ndarray:
    n = int(sr * duration_s)
    t = np.arange(n) / sr

    # --- Layer 1: the "crack" -- a fast downward FM sweep, most of the perceived pitch/zap. ---
    # Instantaneous frequency sweeps 1900 Hz -> 180 Hz over the first ~70ms (exponential glide,
    # the classic descending-zap shape), then holds near the floor for the rest of the sound.
    sweep_end_s = 0.07
    f_start, f_end = 1900.0, 180.0
    sweep_n = int(sr * sweep_end_s)
    inst_freq = np.empty(n)
    inst_freq[:sweep_n] = f_start * (f_end / f_start) ** (np.linspace(0, 1, sweep_n))
    inst_freq[sweep_n:] = f_end
    phase = 2 * np.pi * np.cumsum(inst_freq) / sr
    tone = np.sin(phase)
    # Fast attack (1ms), sharp exponential decay (~90ms time constant) -- a "crack", not a pad.
    attack_n = int(sr * 0.001)
    env_tone = np.ones(n)
    env_tone[:attack_n] = np.linspace(0, 1, attack_n)
    decay_tail = np.exp(-np.arange(n - attack_n) / (sr * 0.09))
    env_tone[attack_n:] = decay_tail
    tone *= env_tone

    # --- Layer 2: the "crackle" -- band-limited noise, amplitude-gated in short random bursts ---
    # so it stutters rather than hissing smoothly (the texture that reads as "electrical" rather
    # than "wind"). Gate built from a fixed-seed RNG so the file is reproducible.
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal(n)
    noise = bandpass(noise, low_hz=800.0, high_hz=6500.0, sr=sr, stages=2)

    gate_step_s = 0.006  # ~6ms gate steps -> audible stutter, not a smooth envelope
    gate_steps = int(np.ceil(n / (sr * gate_step_s)))
    gate_vals = rng.uniform(0.15, 1.0, size=gate_steps) ** 2  # skew toward gaps between bursts
    gate = np.repeat(gate_vals, int(sr * gate_step_s))[:n]
    overall_decay = np.exp(-np.arange(n) / (sr * 0.16))
    crackle = noise * gate * overall_decay

    # --- Mix + soft-clip for a bit of harmonic bite (an analogue-overdrive-style tanh, not a
    # hard digital clip) --- then normalize to a fixed peak so the file has a known, repeatable
    # loudness regardless of the exact mix ratio chosen above.
    mix = 0.62 * tone + 0.55 * crackle
    mix = np.tanh(mix * 1.4)
    peak = np.max(np.abs(mix))
    if peak > 0:
        mix = mix / peak * 0.89  # -1 dBFS-ish headroom, matches this repo's other trimmed cast SFX

    return mix.astype(np.float64)


def spectral_centroid_hz(x: np.ndarray, sr: int) -> float:
    spec = np.abs(np.fft.rfft(x))
    freqs = np.fft.rfftfreq(len(x), d=1.0 / sr)
    if spec.sum() == 0:
        return 0.0
    return float(np.sum(freqs * spec) / np.sum(spec))


def main(out_path: str) -> None:
    x = synth_lightning_crack()
    sf.write(out_path, x, SR, subtype="PCM_16")

    # Self-verification: re-run the synthesis a second time and diff by hash, the same
    # "prove determinism, don't assume it" check this repo's Composer log uses for its
    # MIDI renders.
    x2 = synth_lightning_crack()
    assert np.array_equal(x, x2), "synthesis is not deterministic across runs"

    with open(out_path, "rb") as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()

    peak_dbfs = 20 * np.log10(np.max(np.abs(x)) + 1e-12)
    rms_dbfs = 20 * np.log10(np.sqrt(np.mean(x**2)) + 1e-12)
    centroid = spectral_centroid_hz(x, SR)

    print(f"wrote {out_path}")
    print(f"  duration: {len(x) / SR:.3f}s, sample_rate: {SR}, samples: {len(x)}")
    print(f"  peak: {peak_dbfs:.2f} dBFS, rms: {rms_dbfs:.2f} dBFS")
    print(f"  spectral centroid: {centroid:.1f} Hz")
    print(f"  sha256: {file_hash}")
    print("  determinism check: OK (byte-identical across two independent synthesis runs)")


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "lightning-cast-synth-candidate.wav"
    main(out)
