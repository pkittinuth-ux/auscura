import os
import glob
import pandas as pd
import numpy as np
from preprocessing import load_and_normalize, bandpass_filter, parse_annotation
from features import extract_features
from model import map_icbhi_to_custom, build_model, save_model, LOC_MAP

def extract_location_from_path(path):
    """Extracts location (e.g. 'Al', 'Tc') from ICBHI filename."""
    base = os.path.basename(path)
    parts = base.split('_')
    if len(parts) >= 3:
        return parts[2]
    return 'Al'

def process_icbhi_dataset(dataset_path):
    """
    Walks through the ICBHI dataset, extracts features for every annotated segment,
    and maps them to custom labels.
    """
    audio_files = glob.glob(os.path.join(dataset_path, "**/*.wav"), recursive=True)
    data_records = []

    print(f"Found {len(audio_files)} audio files. Processing...")

    # Limit for testing if needed, but let's try full
    for wav_path in audio_files:
        txt_path = wav_path.replace(".wav", ".txt")
        if not os.path.exists(txt_path):
            continue

        # Get location
        loc_str = extract_location_from_path(wav_path)
        loc_val = LOC_MAP.get(loc_str, 0)

        # Load audio once per file
        try:
            y_raw = load_and_normalize(wav_path)
            y_filt = bandpass_filter(y_raw)
            sr = 16000
        except:
            continue

        # Get annotations
        events = parse_annotation(txt_path)
        
        for event in events:
            # Slice audio for the event
            start_idx = int(event['start'] * sr)
            end_idx = int(event['end'] * sr)
            y_segment = y_filt[start_idx:end_idx]
            
            if len(y_segment) < 1600: # at least 100ms for stability
                continue
                
            # Extract features (New enhanced set)
            feats = extract_features(y_segment, sr=sr)
            
            # Map label (Now includes location)
            custom_label = map_icbhi_to_custom(event['crackle'], event['wheeze'], location=loc_str)
            
            # Combine into a vector
            # Vector: [mfccs, delta_mfccs, spectral..., chroma..., location]
            x_vec = (
                feats['mfcc_mean'] + 
                feats['mfcc_std'] + 
                feats['mfcc_delta_mean'] +
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
                    float(loc_val) # Include location as a feature
                ] +
                feats['chroma_mean']
            )
            
            data_records.append({
                'features': x_vec,
                'label': custom_label
            })

    return pd.DataFrame(data_records)

def main(dataset_path="./icbhi_dataset"):
    if not os.path.exists(dataset_path):
        print(f"Dataset path '{dataset_path}' not found.")
        return

    df = process_icbhi_dataset(dataset_path)
    if df.empty:
        print("No valid data found.")
        return

    print(f"Processed {len(df)} samples.")
    
    # Check class distribution
    print("Class distribution:")
    print(df['label'].value_counts())
    
    X = np.stack(df['features'].values)
    y = df['label'].values
    
    model = build_model(X, y)
    save_model(model, 'lung_model.joblib')

if __name__ == "__main__":
    import kagglehub
    print("Checking for ICBHI dataset...")
    target_path = "./icbhi_dataset"
    try:
        auto_path = kagglehub.dataset_download("nimalanparameshwaran/icbhi-2017-challenge-respiratory-sound-database")
        # In this specific Kaggle version, audio might be in ICBHI_final_database
        potential_path = os.path.join(auto_path, "ICBHI_final_database")
        if os.path.exists(potential_path):
            target_path = potential_path
        else:
            target_path = auto_path
        print(f"Using dataset at: {target_path}")
    except Exception as e:
        print(f"Kagglehub error: {e}")

    main(target_path)
