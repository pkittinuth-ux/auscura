"""
AI Service - FastAPI Server
Exposes POST /analyze endpoint for the Node backend.
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os
import uvicorn

from inference import predict_lung_sound

app = FastAPI(
    title="Auscura AI Service",
    description="Lung sound classification API",
    version="1.0.0"
)

# Allow requests from Node backend (localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Auscura AI Service"}


@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    """
    Accepts a WAV audio file, runs lung sound inference,
    and returns the prediction result as JSON.
    """
    # Validate file type
    if not file.filename.lower().endswith((".wav", ".WAV")):
        raise HTTPException(status_code=400, detail="Only WAV files are supported.")

    # Save upload to a temp file (inference needs a real file path)
    suffix = ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        content = await file.read()
        tmp.write(content)

    try:
        result = predict_lung_sound(tmp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])

    return result


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
