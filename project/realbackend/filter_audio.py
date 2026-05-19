import sys
import librosa
import soundfile as sf
from scipy.signal import butter, lfilter

def butter_bandpass_filter(data, lowcut, highcut, fs, order=5):
    nyq = 0.5 * fs
    low = lowcut / nyq
    high = highcut / nyq
    b, a = butter(order, [low, high], btype='bandpass')
    y = lfilter(b, a, data)
    return y

def main():
    if len(sys.argv) < 3:
        print("Usage: python filter_audio.py <input_file> <output_file>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    try:
        # โหลดไฟล์เสียง
        y, sr = librosa.load(input_file, sr=16000)

        # กรองเสียง (50 Hz - 2500 Hz)
        filtered_y = butter_bandpass_filter(y, lowcut=50.0, highcut=2500.0, fs=sr, order=5)

        # เซฟไฟล์ใหม่
        sf.write(output_file, filtered_y, sr)
        print(f"SUCCESS: Filtered audio saved to {output_file}")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
