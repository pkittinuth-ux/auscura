const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function sendAudioToAI(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        console.error("Please place a test .wav file named 'sample.wav' in the 'uploads' directory.");
        return;
    }

    console.log(`Sending ${filePath} to AI Service...`);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    try {
        const response = await axios.post('http://127.0.0.1:8000/analyze', formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        console.log("=== AI Service Result ===");
        console.log(JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error("Error connecting to AI Service:", error.message);
        if (error.response) {
            console.error("Server responded with:", error.response.data);
        } else {
            console.log("Make sure the Python API Server is running on http://127.0.0.1:8000");
        }
    }
}

// Example usage
const sampleAudioPath = path.join(__dirname, 'uploads', 'sample.wav');
sendAudioToAI(sampleAudioPath);
