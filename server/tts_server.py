#!/usr/bin/env python3
import sys
import os
import json
import shutil

# Add local path
sys.path.insert(0, os.path.dirname(__file__))

# Try to import the wrapper, if not available, download it
try:
    import pocket_tts_onnx
except ImportError:
    from huggingface_hub import hf_hub_download

    wrapper = hf_hub_download(
        "KevinAHM/pocket-tts-onnx", "pocket_tts_onnx.py", repo_type="model"
    )
    shutil.copy(wrapper, os.path.join(os.path.dirname(__file__), "pocket_tts_onnx.py"))
    import pocket_tts_onnx

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "temp_output.wav")
VOICE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "client", "assets", "voice_10s.wav"
)

# ONNX models directory
ONNX_MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "onnx_models")

_onnx_tts = None


def get_tts():
    global _onnx_tts
    if _onnx_tts is None:
        print("Loading ONNX TTS...", flush=True)
        _onnx_tts = pocket_tts_onnx.PocketTTSOnnx(
            models_dir=ONNX_MODELS_DIR,
            language="english_2026-04",
            precision="fp32",
            temperature=0.5,
        )
        print("ONNX TTS loaded!", flush=True)
    return _onnx_tts


def generate_speech(text, voice_file=None):
    tts = get_tts()

    print(f"Generating speech for: {text[:50]}...", flush=True)

    try:
        if voice_file and os.path.exists(voice_file):
            print(f"Using voice clone from: {voice_file}", flush=True)
            audio = tts.generate(text=text, voice=voice_file)
        else:
            print("Using default voice", flush=True)
            audio = tts.generate(text=text, voice="alba")
    except Exception as e:
        print(f"Voice cloning failed: {e}, using default", flush=True)
        # Generate without voice parameter (basic TTS)
        audio = tts.generate(text=text)

    # Save audio
    tts.save_audio(audio, OUTPUT_PATH)
    print(f"Audio saved to {OUTPUT_PATH}", flush=True)


if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    text = data.get("text", "")
    generate_speech(text, VOICE_PATH)
