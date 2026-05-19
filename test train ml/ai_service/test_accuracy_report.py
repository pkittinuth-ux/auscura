"""
Test Accuracy Report
====================
Runs inference on all WAV files in the test_accuracy_old/ folder,
maps each filename to an expected label, and reports accuracy %.
"""

import sys, io, os, json

# Fix encoding for Windows terminal
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from inference import predict_lung_sound

# ─── Expected label mapping ────────────────────────────────────────────────────
# Maps substrings found in filenames to the expected CLASS label.
# Order matters: more specific keys should come first.
FILENAME_TO_LABEL = {
    "vesicular breath":  "A",   # Vesicular (Normal)
    "bronchial":         "C",   # Bronchial
    "stridor":           "D",   # Stridor
    "wheezing":          "E",   # Wheeze
    "wheeze":            "E",
    "ronchi":            "F",   # Rhonchi
    "rhonchi":           "F",
    "crackles fine":     "G",   # Fine Crackles
    "fine crackles":     "G",
    "crackles coarse":   "H",   # Coarse Crackles
    "coarse crackles":   "H",
    "pleural rub":       "I",   # Pleural Rub
    "squawk":            "J",   # Squawks
}

def get_expected_label(filename: str) -> str:
    """Return the expected label by matching filename keywords (case-insensitive)."""
    lower = filename.lower()
    for keyword, label in FILENAME_TO_LABEL.items():
        if keyword in lower:
            return label
    return "?"   # Unknown — will be counted as a miss

# ─── Run evaluation ────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEST_DIR   = os.path.join(SCRIPT_DIR, "test_accuracy_old")

wav_files = [f for f in os.listdir(TEST_DIR) if f.lower().endswith(".wav")]

if not wav_files:
    print("No WAV files found in test_accuracy_old/")
    sys.exit(1)

print("=" * 90)
print(f"{'File':<42} {'Expected':<10} {'Predicted':<10} {'Match':<6} {'Conf':<7} {'Type'}")
print("=" * 90)

correct   = 0
total     = 0
results   = []

for fname in sorted(wav_files):
    fpath    = os.path.join(TEST_DIR, fname)
    expected = get_expected_label(fname)
    result   = predict_lung_sound(fpath)

    if "error" in result:
        predicted = "ERROR"
        match     = False
        conf      = 0.0
        rtype     = result["error"]
    else:
        predicted = result["label"]
        conf      = result.get("confidence", 0.0)
        rtype     = result.get("type", "")
        match     = (predicted == expected)

    if match:
        correct += 1
    total += 1

    mark = "✓" if match else "✗"
    results.append({
        "file":      fname,
        "expected":  expected,
        "predicted": predicted,
        "match":     match,
        "conf":      conf,
        "type":      rtype,
    })
    print(f"  {fname:<40} {expected:<10} {predicted:<10} {mark:<6} {conf:<7.2f} {rtype}")

# ─── Summary ──────────────────────────────────────────────────────────────────
accuracy = (correct / total * 100) if total > 0 else 0.0

print("=" * 90)
print(f"\n  Files tested : {total}")
print(f"  Correct      : {correct}")
print(f"  Wrong        : {total - correct}")
print(f"\n  ✅ Accuracy : {accuracy:.1f}%\n")
print("=" * 90)

# Per-label breakdown
from collections import defaultdict
label_stats = defaultdict(lambda: {"expected": 0, "hit": 0})
for r in results:
    label_stats[r["expected"]]["expected"] += 1
    if r["match"]:
        label_stats[r["expected"]]["hit"] += 1

print("\n  Per-label breakdown:")
print(f"  {'Label':<10} {'Expected Files':<16} {'Correct':<10} {'Accuracy'}")
print("  " + "-" * 50)
for label in sorted(label_stats):
    s   = label_stats[label]
    acc = (s["hit"] / s["expected"] * 100) if s["expected"] > 0 else 0
    print(f"  {label:<10} {s['expected']:<16} {s['hit']:<10} {acc:.1f}%")

print()
