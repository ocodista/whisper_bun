#!/usr/bin/env python3
"""
Faster Whisper transcription script
Uses faster-whisper for improved performance
Supports CUDA (NVIDIA) and optimized CPU for macOS
"""

import sys
import json
import platform
from pathlib import Path

try:
    from faster_whisper import WhisperModel
except ImportError:
    print(json.dumps({
        "error": "faster-whisper not installed",
        "message": "Please install: pip install faster-whisper"
    }), file=sys.stderr)
    sys.exit(1)


def transcribe_audio(audio_path: str, model_size: str = "base.en") -> dict:
    """
    Transcribe audio file using faster-whisper

    Args:
        audio_path: Path to WAV file
        model_size: Model size (tiny, base, small, medium, large)

    Returns:
        Dictionary with transcription results
    """
    try:
        # Detect platform and optimize accordingly
        is_macos = platform.system() == "Darwin"
        device_used = "cpu"

        # Try CUDA first (for NVIDIA GPUs)
        try:
            model = WhisperModel(model_size, device="cuda", compute_type="float16")
            device_used = "cuda"
            print(f"[GPU] Running on CUDA with float16", file=sys.stderr)
        except Exception:
            # On macOS, use optimized CPU settings for Apple Silicon
            if is_macos:
                # Use float32 for better accuracy on Apple Silicon
                # The Accelerate framework will handle optimization
                model = WhisperModel(
                    model_size,
                    device="cpu",
                    compute_type="float32",
                    cpu_threads=0,  # Use all available cores
                    num_workers=1
                )
                print(f"[CPU] Running on macOS (Apple Silicon optimized) with float32", file=sys.stderr)
            else:
                # Standard CPU fallback for other platforms
                model = WhisperModel(model_size, device="cpu", compute_type="int8")
                print(f"[CPU] Running on CPU with int8", file=sys.stderr)

        # Transcribe
        segments, info = model.transcribe(
            audio_path,
            language="en",
            beam_size=5,
            vad_filter=True,  # Voice activity detection
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        # Collect segments
        transcription_segments = []
        full_text = []

        for segment in segments:
            transcription_segments.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip()
            })
            full_text.append(segment.text.strip())

        return {
            "success": True,
            "text": " ".join(full_text),
            "segments": transcription_segments,
            "language": info.language,
            "language_probability": info.language_probability
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "No audio file specified",
            "usage": "python transcribe.py <audio_file> [model_size]"
        }), file=sys.stderr)
        sys.exit(1)

    audio_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base.en"

    if not Path(audio_path).exists():
        print(json.dumps({
            "error": f"Audio file not found: {audio_path}"
        }), file=sys.stderr)
        sys.exit(1)

    result = transcribe_audio(audio_path, model_size)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
