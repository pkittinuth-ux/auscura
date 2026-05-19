"""
test_file.py — Interactive Lung Sound Tester
=============================================
Run this script, then type any filename (or full path) to get
an instant inference result.

Usage:
    python test_file.py
"""

import sys, io, os, json

# Fix encoding for Windows terminal
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from inference import predict_lung_sound

# ─── Search locations ─────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

SEARCH_DIRS = [
    SCRIPT_DIR,
    os.path.join(SCRIPT_DIR, "test_accuracy"),
    r"D:\++Project\2026-Auscura\Auscura\.cache\ICBHI\Original\ICBHI_final_database",
    r"D:\++Project\2026-Auscura\Auscura\.cache\ICBHI\Original\ICBHI_final_database",
]

SEVERITY_ICON = {
    "Good":     "🟢",
    "Warning":  "🟡",
    "Bad":      "🔴",
    "Critical": "🚨",
    "N/A":      "⚪",
}

def find_file(name: str) -> str | None:
    """Find the WAV file by name (with or without .wav, with or without full path)."""
    # If user gave a full path that exists, use it directly
    if os.path.isfile(name):
        return name

    # Add .wav if missing
    if not name.lower().endswith(".wav"):
        name = name + ".wav"

    # Try each search directory
    for d in SEARCH_DIRS:
        candidate = os.path.join(d, name)
        if os.path.isfile(candidate):
            return candidate

    return None

def print_result(result: dict, file_path: str):
    """Pretty-print the inference result."""
    width = 60
    print()
    print("═" * width)

    if "error" in result:
        print(f"  ❌ Error: {result['error']}")
        print("═" * width)
        return

    icon = SEVERITY_ICON.get(result.get("severity", "N/A"), "⚪")
    print(f"  📁 File     : {os.path.basename(file_path)}")
    print(f"  🏷️  Label    : {result['label']}  —  {result['type']}")
    print(f"  {icon} Severity : {result['severity']}")
    print(f"  🎯 Confidence: {result['confidence']*100:.1f}%")
    print()

    details = result.get("details", {})
    print(f"  📍 Location : {details.get('location_detected', '-')}")
    print(f"  🎵 Dom. Freq: {details.get('dominant_freq_detected', '-')}")
    print(f"  🔬 Segments : {details.get('segments_analyzed', '-')}")
    print()

    print(f"  💬 Result   : {result.get('result_message', '-')}")
    print(f"  🏥 Clinical : {result.get('clinical_note', '-')}")
    print("═" * width)
    print()

def main():
    print()
    print("╔══════════════════════════════════════════════╗")
    print("║   🫁  Lung Sound Interactive Tester          ║")
    print("║   Type a filename or full path to test.      ║")
    print("║   Type  'quit'  or  'q'  to exit.            ║")
    print("╚══════════════════════════════════════════════╝")
    print()
    print(f"  Search dirs:")
    for d in SEARCH_DIRS:
        if os.path.isdir(d):
            print(f"    ✅ {d}")
        else:
            print(f"    ❌ {d}  (not found)")
    print()

    while True:
        try:
            user_input = input("  Enter filename > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n  Goodbye!")
            break

        if not user_input:
            continue
        if user_input.lower() in ("quit", "q", "exit"):
            print("  Goodbye!")
            break

        file_path = find_file(user_input)
        if not file_path:
            print(f"\n  ⚠️  File not found: '{user_input}'")
            print(f"      Make sure the file exists in one of the search dirs above.")
            print(f"      Tip: you can also paste the full path.\n")
            continue

        print(f"\n  ⏳ Running inference on: {file_path}")
        result = predict_lung_sound(file_path)
        print_result(result, file_path)

if __name__ == "__main__":
    main()
