const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ================= ค่าคงที่ =================
const PORT = 8888;
const SAMPLE_RATE = 16000;    // 16,000 Hz
const BIT_DEPTH   = 16;       // 16-bit
const CHANNELS    = 1;        // Mono

// ================= State =================
let isRecording = false;
let audioChunks = [];
let totalBytesReceived = 0;

// ================= HTTP Server =================
// ใช้สำหรับให้ Frontend มาโหลดไฟล์เสียงไปวิเคราะห์
const server = http.createServer((req, res) => {
  // เพิ่ม CORS Header
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.url === '/recording.wav' || req.url === '/clean_recording.wav') {
    const filename = req.url.replace('/', '');
    const wavPath = path.join(__dirname, filename);
    if (fs.existsSync(wavPath)) {
      res.writeHead(200, { 'Content-Type': 'audio/wav' });
      fs.createReadStream(wavPath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('File not found');
    }
    return;
  }

  res.writeHead(200);
  res.end('Auscura Backend is running (WebSocket on port 8081)');
});

// ================= WebSocket =================
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('\n[WS] Client connected');

  ws.on('message', (data, isBinary) => {
    if (!isBinary) {
      const command = data.toString();
      if (command === 'start') {
        console.log('\n[Recording Started] Receiving audio via WebSocket...');
        isRecording = true;
        audioChunks = [];
        totalBytesReceived = 0;
      } else if (command === 'end') {
        if (!isRecording) return;
        isRecording = false;
        console.log(`\n[Recording Finished] Total received: ${(totalBytesReceived / 1024).toFixed(2)} KB`);
        
        const rawWavPath = path.join(__dirname, 'recording.wav');
        const cleanWavPath = path.join(__dirname, 'clean_recording.wav');
        
        const pcmBuffer = Buffer.concat(audioChunks);
        const wavBuffer = pcmToWav(pcmBuffer, SAMPLE_RATE, CHANNELS, BIT_DEPTH);
        
        fs.writeFileSync(rawWavPath, wavBuffer);
        console.log(`[Saved] recording.wav`);
        
        // เรียกใช้ Python Script เพื่อกรองเสียง (Bandpass Filter 50-2500Hz)
        console.log('[Processing] Applying Butterworth Bandpass Filter (50Hz - 2500Hz)...');
        exec(`python filter_audio.py "${rawWavPath}" "${cleanWavPath}"`, (error, stdout, stderr) => {
          if (error) {
            console.error(`[Filter Error] ${error.message}`);
            ws.send(JSON.stringify({ status: 'saved', file: 'recording.wav', filter_error: true }));
            return;
          }
          console.log(`[Filtered] clean_recording.wav created!`);
          
          // ส่งสัญญาณกลับไปบอก Client พร้อมแนบไฟล์ที่กรองแล้ว
          ws.send(JSON.stringify({ status: 'saved', raw_file: 'recording.wav', clean_file: 'clean_recording.wav' }));
        });
      }
    } else {
      // รับข้อมูล Binary PCM
      if (isRecording) {
        audioChunks.push(Buffer.from(data));
        totalBytesReceived += data.length;
        process.stdout.write(`\r  Streaming... ${(totalBytesReceived / 1024).toFixed(1)} KB`);
      }
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
  });
});

// ================= WAV Converter =================
function pcmToWav(pcmBuffer, sampleRate, channels, bitDepth) {
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Backend Server & WebSocket running on port ${PORT}`);
  console.log(`- Local Access: http://localhost:${PORT}`);
  console.log(`- External Access: http://[YOUR_IP]:${PORT} (Use this for ESP32)`);
  console.log(`- WebSocket URL: ws://[YOUR_IP]:${PORT}`);
  console.log(`- Audio File URL: http://[YOUR_IP]:${PORT}/recording.wav`);
});
