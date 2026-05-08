import librosa
import numpy as np
import scipy.signal as signal
import os

def load_and_normalize(file_path, sr=16000):
    """Loads audio, converts to mono, and resamples to 16kHz."""
    y, _ = librosa.load(file_path, sr=sr, mono=True)
    # Normalize amplitude
    y = librosa.util.normalize(y)
    return y

def bandpass_filter(data, lowcut=50, highcut=2000, sr=16000, order=5):
    """Applies a Butterworth bandpass filter."""
    nyq = 0.5 * sr
    low = lowcut / nyq
    high = highcut / nyq
    b, a = signal.butter(order, [low, high], btype='band')
    y = signal.lfilter(b, a, data)
    return y

def parse_annotation(file_path):
    """Parses .txt annotation file: start, end, crackle (0/1), wheeze (0/1)."""
    events = []
    if not os.path.exists(file_path):
        return events
    
    with open(file_path, 'r') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 4:
                events.append({
                    'start': float(parts[0]),
                    'end': float(parts[1]),
                    'crackle': int(parts[2]),
                    'wheeze': int(parts[3])
                })
    return events

def detect_silence(y, top_db=20):
    """Returns True if the audio is mostly silence or low energy."""
    intervals = librosa.effects.split(y, top_db=top_db)
    if len(intervals) == 0:
        return True
    return False

if __name__ == "__main__":
    # Example usage (would need a real file)
    # y = load_and_normalize("sample.wav")
    # y_filtered = bandpass_filter(y)
    pass
