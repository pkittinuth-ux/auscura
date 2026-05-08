import sys, json, io, os
sys.path.insert(0, os.path.dirname(__file__))
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from inference import predict_lung_sound

BASE = r"C:\Users\compu\.cache\kagglehub\datasets\nimalanparameshwaran\icbhi-2017-challenge-respiratory-sound-database\versions\1\ICBHI_final_database"

FILES = [
    "178_1b2_Ar_mc_AKGC417L.wav",
    "177_1b4_Pr_mc_AKGC417L.wav",
    "185_1b1_Pl_sc_Litt3200.wav",
    "186_2b3_Tc_mc_AKGC417L.wav",
    "200_2p2_Tc_mc_AKGC417L.wav",
]

print(f"{'File':<40} {'Label':<8} {'Type':<25} {'Severity':<10} {'Conf':<7} {'Freq'}")
print("-" * 115)
for f in FILES:
    path = os.path.join(BASE, f)
    r = predict_lung_sound(path)
    if "error" in r:
        print(f"{f:<40} ERROR: {r['error']}")
    else:
        print(f"{f:<40} {r['label']:<8} {r['type']:<25} {r['severity']:<10} {r['confidence']:.2f}  {r['details']['dominant_freq_detected']}")
