"""
retrain.py — Full-Dataset Training (Generalization Mode)
=========================================================
Trains a generalizable lung sound model on the ENTIRE clinical ICBHI 2017 dataset
(920+ files) while EXCLUDING the 5 specific test files.

This turns the 'test_accuracy' folder and 'test_accuracy_old' folder
into a 100% pure unseen test set to measure genuine AI generalization accuracy.

Usage:
    python retrain.py
"""

import os, sys, io, warnings, glob
import numpy as np
import pandas as pd
from collections import Counter
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

warnings.filterwarnings('ignore')

# Fix encoding for Windows terminal
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from preprocessing import load_and_normalize, bandpass_filter, parse_annotation
from features import extract_features
from model import save_model, map_icbhi_to_custom, LOC_MAP

# ─── Config ───────────────────────────────────────────────────────────────────
SR           = 16000
ICBHI_BASE   = r"D:\++Project\2026-Auscura\Auscura\.cache\ICBHI\Original\ICBHI_final_database"

# Files to EXCLUDE from the training set (to keep the test set 100% unseen)
EXCLUDE_FILES = {
    "177_1b4_Pr_mc_AKGC417L.wav",
    "178_1b2_Ar_mc_AKGC417L.wav",
    "185_1b1_Pl_sc_Litt3200.wav",
    "186_2b3_Tc_mc_AKGC417L.wav",
    "200_2p2_Tc_mc_AKGC417L.wav",
}

def extract_location_from_path(path):
    base = os.path.basename(path)
    parts = base.split('_')
    if len(parts) >= 3:
        return parts[2]
    return 'Al'

# ─── Feature vector builder ───────────────────────────────────────────────────
def build_vector(y_seg, loc_val):
    feats = extract_features(y_seg, sr=SR)
    return (
        feats['mfcc_mean']        +
        feats['mfcc_std']         +
        feats['mfcc_delta_mean']  +
        [
            feats['spectral_centroid_mean'],
            feats['spectral_centroid_std'],
            feats['spectral_rolloff_mean'],
            feats['spectral_bandwidth_mean'],
            feats['dominant_freq_mean'],
            feats['rms_mean'],
            feats['rms_std'],
            feats['zcr_mean'],
            feats['duration'],
            float(loc_val),
        ] +
        feats['chroma_mean']
    )

# ─── Process Dataset ──────────────────────────────────────────────────────────
def main():
    if not os.path.exists(ICBHI_BASE):
        print(f"❌ ICBHI Dataset path not found: {ICBHI_BASE}")
        return

    audio_files = glob.glob(os.path.join(ICBHI_BASE, "*.wav"))
    print(f"Found {len(audio_files)} WAV files in ICBHI database.")
    
    # Filter out the 5 test files
    train_files = [f for f in audio_files if os.path.basename(f) not in EXCLUDE_FILES]
    print(f"Training on {len(train_files)} files (excluding {len(EXCLUDE_FILES)} test files). Processing...\n")

    X_all, y_all = [], []
    processed_count = 0

    for idx, wav_path in enumerate(train_files):
        txt_path = wav_path.replace(".wav", ".txt")
        if not os.path.exists(txt_path):
            continue
        
        loc_str = extract_location_from_path(wav_path)
        loc_val = LOC_MAP.get(loc_str, 0)

        try:
            # flie preprocessing.py
            # โหลดเสียง normalize ให้เสียงดังใกล้เคียงกัน
            y_raw  = load_and_normalize(wav_path, sr=SR)
            # กรองเสียงรบกวน(เสียงฮัมและเสียงรบกวนช่วงความถี่ต่ำ) 
            y_filt = bandpass_filter(y_raw)
        except Exception:
            continue
        # อ่าน annotation จากไฟล์ txt (icbhi)
        events = parse_annotation(txt_path)

        # หั่นเสียงเป็นท่อนย่อยยาวเท่าๆ กันท่อนละ 2.5 วินาที
        for event in events:
            start_idx = int(event['start'] * SR)
            end_idx   = int(event['end'] * SR)
            y_segment = y_filt[start_idx:end_idx]
            
            if len(y_segment) < 1600:  # Skip segments shorter than 100ms
                continue

            try:
                # ดึง Feature นี่คือ “แปลงเสียงให้เป็นตัวเลข”
                # mfcc Mel-Frequency Cepstral Coefficients
                # เทคนิคที่ใช้ดึงคุณลักษณะเด่นของ "เสียง" (Feature Extraction) เพื่อแปลงสัญญาณเสียงดิบให้อยู่ในรูปของตัวเลข
                vec = build_vector(y_segment, loc_val)
                # แปลง Label (A-J) ให้เป็นตัวเลข (0-9)
                label = map_icbhi_to_custom(event['crackle'], event['wheeze'], location=loc_str)
                # crackle	wheeze	label
                # 0	0	normal
                # 1	0	crackle
                # 0	1	wheeze
                X_all.append(vec)
                y_all.append(label)
            except Exception:
                pass

        processed_count += 1
        if processed_count % 100 == 0:
            print(f"  Processed {processed_count}/{len(train_files)} files...")

    X = np.array(X_all, dtype=np.float32)
    y = np.array(y_all)

    print(f"\nProcessing complete!")
    print(f"Total training samples: {len(X)}")
    print(f"Class distribution: {dict(sorted(Counter(y).items()))}")

    if len(np.unique(y)) < 2:
        print("ERROR: Need at least 2 classes to train.")
        return

    # ── Train robust Random Forest ─────────────────────────────────────────────
    print("\nTraining generalizable Random Forest Classifier (Optimized)...")
    
    # Stratified split to check training accuracy
    # แบ่งข้อมูลเป็น 85% สำหรับ Train, 15% สำหรับ Test
    # random_state = “seed การสุ่ม”
    # stratify=y = การันตีว่าสัดส่วนของเสียงแต่ละประเภท (Normal, Crackle, Wheeze) ใน Train กับ Test จะเท่ากันเป๊ะ
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    # สุ่มเลือกข้อมูลมาเป็นตัวแทนสำหรับ Train และ Test
    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=25,
        min_samples_leaf=2,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
    )
    
    model.fit(X_train, y_train)
    # วัด Accuracy
    val_acc = model.score(X_val, y_val)
    print(f"\nValidation Set Accuracy: {val_acc * 100:.2f}%")
    
    # Retrain on full dataset
    # เอาข้อมูลทั้งหมดมาสอนอีกครั้ง
    # เพื่อให้โมเดลเก่งที่สุดก่อน save
    print("Fitting model on all training data...")
    model.fit(X, y)

    # ── Save ───────────────────────────────────────────────────────────────────
    save_model(model, 'lung_model.joblib')
    print("\n✅ Model saved as lung_model.joblib")
    print("   Now run:  python test_accuracy_report.py  to test the unseen files!")

if __name__ == "__main__":
    main()
