import kagglehub
import os

def download_dataset():
    print("Downloading ICBHI 2017 Challenge Respiratory Sound Database...")
    path = kagglehub.dataset_download("nimalanparameshwaran/icbhi-2017-challenge-respiratory-sound-database")
    print(f"Dataset downloaded to: {path}")
    return path

if __name__ == "__main__":
    download_dataset()
