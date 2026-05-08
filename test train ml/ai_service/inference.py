from preprocessing import load_and_normalize, bandpass_filter, detect_silence
from features import extract_features
from model import load_model_file, CLASS_DETAILS, LOC_MAP
import numpy as np
import os

# Get the directory of the current script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MODEL_PATH = os.path.join(SCRIPT_DIR, 'lung_model.joblib')

def extract_location_from_path(path):
    base = os.path.basename(path)
    parts = base.split('_')
    if len(parts) >= 3:
        return parts[2]
    return 'Al'

def get_severity_rank(severity):
    ranks = {'Good': 0, 'Warning': 1, 'Bad': 2, 'Critical': 3}
    return ranks.get(severity, 0)

def predict_lung_sound(file_path, model_path=DEFAULT_MODEL_PATH):
    """
    Main inference function with Segment-based analysis and Frequency refinement.
    """
    # 1. Load and Preprocess
    try:
        y = load_and_normalize(file_path)
    except Exception as e:
        return {"error": f"Failed to load file: {str(e)}"}

    if detect_silence(y):
        return {
            "label": "Invalid",
            "type": "Noise/Silence",
            "result": "Discard",
            "description": "The audio input is too quiet.",
            "severity": "N/A"
        }

    y_filtered = bandpass_filter(y)
    sr = 16000
    
    # 2. Segmenting (Split into 2.5s chunks)
    segment_len = int(2.5 * sr)
    num_segments = max(1, len(y_filtered) // segment_len)
    
    all_predictions = []
    loc_str = extract_location_from_path(file_path)
    loc_val = LOC_MAP.get(loc_str, 0)
    
    model = load_model_file(model_path)
    if not model:
        return {"error": "Model file not found."}

    # Process each segment
    for i in range(num_segments):
        start = i * segment_len
        end = min(start + segment_len, len(y_filtered))
        y_seg = y_filtered[start:end]
        
        if len(y_seg) < 1600: continue # Skip very short tail
        
        feats = extract_features(y_seg)
        
        # Construct Feature Vector
        X_vec = (
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
                float(loc_val)
            ] +
            feats['chroma_mean']
        )
        
        # Raw Prediction
        pred_label = model.predict([X_vec])[0]
        conf = np.max(model.predict_proba([X_vec])[0])
        
        # 3. Frequency & Spectral Refinement (Hard-rules based on User's Data)
        dom_freq = feats['dominant_freq_mean']
        spec_centroid = feats['spectral_centroid_mean']
        spec_rolloff = feats['spectral_rolloff_mean']
        
        # Rule-based Overrides/Refinements
        
        # A. Priority Check: Stridor (D) - Detect even if model predicts Crackle
        # Stridor is critical, so we check for high continuous freq in upper airway
        if (dom_freq > 400 and dom_freq < 3000) and loc_str in ['Tc', 'Ar', 'Al']:
             # If it's loud or has high spectral content, override to Stridor
             if spec_centroid > 650:
                 pred_label = 'D'
        
        # B. Crackle Refinement (Fine vs Coarse) - only if not overridden to Stridor
        if pred_label in ['G', 'H']: 
            if spec_centroid > 150: 
                pred_label = 'G' # Fine
            else:
                pred_label = 'H' # Coarse
        
        # C. Wheeze/Rhonchi Refinement
        if pred_label in ['E', 'F']:
            if dom_freq > 400:
                pred_label = 'E' # Wheeze
            elif dom_freq < 350:
                pred_label = 'F' # Rhonchi
        
        # D. Bronchial detection (Pattern change)
        if pred_label == 'B': 
            if spec_rolloff > 800 or spec_centroid > 350:
                pred_label = 'C'
        
        details = CLASS_DETAILS.get(pred_label, CLASS_DETAILS['B'])
        all_predictions.append({
            "label": pred_label,
            "type": details['type'],
            "severity": details['severity'],
            "confidence": float(conf),
            "freq": dom_freq
        })

    if not all_predictions:
        return {"error": "No valid segments found."}

    # 4. Final Aggregation (Take the most severe result)
    all_predictions.sort(key=lambda x: get_severity_rank(x['severity']), reverse=True)
    best_match = all_predictions[0]
    
    # Get metadata from CLASS_DETAILS
    final_label = best_match['label']
    meta = CLASS_DETAILS.get(final_label, CLASS_DETAILS['B'])

    return {
        "label": final_label,
        "type": meta['type'],
        "severity": meta['severity'],
        "result_message": meta['recommendation'],
        "clinical_note": meta['clinical_note'],
        "description": meta['description'],
        "confidence": best_match['confidence'],
        "details": {
            "location_detected": loc_str,
            "dominant_freq_detected": f"{best_match['freq']:.2f} Hz",
            "segments_analyzed": num_segments
        }
    }

if __name__ == "__main__":
    import argparse
    import json
    import sys
    import io

    # Fix encoding for Windows terminal
    if sys.stdout.encoding != 'utf-8':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    parser = argparse.ArgumentParser(description="Test lung sound inference.")
    parser.add_argument("file_path", help="Path to WAV file.")
    args = parser.parse_args()

    if not os.path.exists(args.file_path):
        print(f"Error: File not found - {args.file_path}")
    else:
        result = predict_lung_sound(args.file_path)
        # Ensure we print with UTF-8
        output = json.dumps(result, indent=2, ensure_ascii=False)
        print(output)
