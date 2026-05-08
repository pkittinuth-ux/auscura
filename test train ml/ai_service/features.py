import librosa
import numpy as np

def extract_features(y, sr=16000):
    """
    Extracts an enhanced set of features from an audio signal.
    """
    features = {}

    # 1. MFCCs (increased to 20)
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)
    features['mfcc_mean'] = np.mean(mfccs, axis=1).tolist()
    features['mfcc_std'] = np.std(mfccs, axis=1).tolist()
    
    # Delta MFCCs (captures temporal changes)
    if mfccs.shape[1] >= 9:
        mfcc_delta = librosa.feature.delta(mfccs)
        features['mfcc_delta_mean'] = np.mean(mfcc_delta, axis=1).tolist()
    else:
        # Fallback to zeros if segment is too short for delta
        features['mfcc_delta_mean'] = [0.0] * mfccs.shape[0]

    # 2. Spectral Features
    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    features['spectral_centroid_mean'] = float(np.mean(spectral_centroid))
    features['spectral_centroid_std'] = float(np.std(spectral_centroid))
    
    spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
    features['spectral_rolloff_mean'] = float(np.mean(spectral_rolloff))

    spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
    features['spectral_bandwidth_mean'] = float(np.mean(spectral_bandwidth))

    # 3. Dominant Frequency
    pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
    dominant_freqs = []
    for t in range(pitches.shape[1]):
        index = magnitudes[:, t].argmax()
        pitch = pitches[index, t]
        if pitch > 0:
            dominant_freqs.append(pitch)
    features['dominant_freq_mean'] = float(np.mean(dominant_freqs)) if dominant_freqs else 0.0

    # 4. Energy distribution
    rms = librosa.feature.rms(y=y)
    features['rms_mean'] = float(np.mean(rms))
    features['rms_std'] = float(np.std(rms))

    # 5. Zero Crossing Rate
    zcr = librosa.feature.zero_crossing_rate(y)
    features['zcr_mean'] = float(np.mean(zcr))

    # 6. Chroma features (Spectral energy distribution across octaves)
    chroma = librosa.feature.chroma_stft(y=y, sr=sr)
    features['chroma_mean'] = np.mean(chroma, axis=1).tolist()

    # 7. Duration
    features['duration'] = float(librosa.get_duration(y=y, sr=sr))

    return features

def detect_events_heuristic(y, sr=16000):
    """
    Placeholder for heuristic event detection.
    """
    detected_wheezes = 0
    detected_crackles = 0
    return {"crackles": detected_crackles, "wheezes": detected_wheezes}

if __name__ == "__main__":
    pass
