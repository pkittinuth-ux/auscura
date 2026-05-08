/**
 * Node.js Backend Server
 * - Receives WAV audio via HTTP POST /upload  (from app / ESP32 over HTTP)
 * - Receives raw PCM via WebSocket           (from ESP32 streaming)
 * - Forwards audio to Python AI Service POST /analyze
 * - Returns / broadcasts prediction result
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const WebSocket = require('ws');
const Busboy = require('busboy');

// ── Config ──────────────────────────────────────────────────────────────────
const PORT = 3000;
const AI_SERVICE_URL = 'http://127.0.0.1:8000/analyze';
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PCM_SAMPLE_RATE = 16000; // Hz – must match ESP32 config
const PCM_CHANNELS = 1;
const PCM_BIT_DEPTH = 16;

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wrap raw PCM Buffer in a minimal WAV header so the AI service can read it.
 */
function pcmToWav(pcmBuffer, sampleRate = PCM_SAMPLE_RATE, channels = PCM_CHANNELS, bitDepth = PCM_BIT_DEPTH) {
    const byteRate = sampleRate * channels * (bitDepth / 8);
    const blockAlign = channels * (bitDepth / 8);
    const dataSize = pcmBuffer.length;
    const headerSize = 44;
    const buffer = Buffer.alloc(headerSize + dataSize);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);           // PCM chunk size
    buffer.writeUInt16LE(1, 20);            // PCM format
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitDepth, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    pcmBuffer.copy(buffer, 44);

    return buffer;
}

/**
 * POST a WAV Buffer (or file path) to the AI service.
 * Returns the prediction JSON or throws on error.
 */
async function sendToAIService(wavBufferOrPath, filename = 'audio.wav') {
    const form = new FormData();

    if (typeof wavBufferOrPath === 'string') {
        // file path
        form.append('file', fs.createReadStream(wavBufferOrPath), { filename });
    } else {
        // Buffer
        form.append('file', wavBufferOrPath, { filename, contentType: 'audio/wav' });
    }

    const response = await axios.post(AI_SERVICE_URL, form, {
        headers: form.getHeaders(),
        timeout: 30000, // 30 s
    });

    return response.data;
}

// ── HTTP Server ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    // ── GET /health ──
    if (req.method === 'GET' && req.url === '/health') {
        res.end(JSON.stringify({ status: 'ok', service: 'Auscura Node Backend' }));
        return;
    }

    // ── POST /upload  (multipart WAV upload) ──
    if (req.method === 'POST' && req.url === '/upload') {
        const bb = Busboy({ headers: req.headers });
        let savedPath = null;
        let fileName = `audio_${Date.now()}.wav`;

        bb.on('file', (_field, stream, info) => {
            if (info.filename) fileName = path.basename(info.filename);
            savedPath = path.join(UPLOADS_DIR, fileName);
            const writeStream = fs.createWriteStream(savedPath);
            stream.pipe(writeStream);
        });

        bb.on('finish', async () => {
            if (!savedPath) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'No file received' }));
                return;
            }

            console.log(`[Upload] Saved ${savedPath}`);

            try {
                const prediction = await sendToAIService(savedPath, fileName);
                console.log('[AI Result]', JSON.stringify(prediction, null, 2));
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, prediction }));
            } catch (err) {
                console.error('[AI Error]', err.message);
                res.writeHead(502);
                res.end(JSON.stringify({
                    error: 'AI service error',
                    detail: err.response?.data || err.message
                }));
            }
        });

        req.pipe(bb);
        return;
    }

    // ── 404 ──
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
});

// ── WebSocket Server (for ESP32 PCM streaming) ───────────────────────────────
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    const clientAddr = req.socket.remoteAddress;
    console.log(`[WS] ESP32 connected from ${clientAddr}`);

    const pcmChunks = [];
    let totalBytes = 0;

    ws.on('message', (data, isBinary) => {
        if (isBinary) {
            pcmChunks.push(data);
            totalBytes += data.length;
        } else {
            // Control message (JSON string)
            try {
                const msg = JSON.parse(data.toString());
                if (msg.cmd === 'analyze') {
                    flushAndAnalyze(ws, pcmChunks, totalBytes);
                    pcmChunks.length = 0;
                    totalBytes = 0;
                }
            } catch (_) { /* ignore malformed */ }
        }
    });

    ws.on('close', async () => {
        console.log(`[WS] ESP32 disconnected (${totalBytes} bytes received)`);
        if (totalBytes > 0) {
            // Auto-analyze on disconnect
            await flushAndAnalyze(ws, pcmChunks, totalBytes);
        }
    });

    ws.on('error', (err) => console.error('[WS Error]', err.message));
});

async function flushAndAnalyze(ws, pcmChunks, totalBytes) {
    if (totalBytes === 0) return;

    const pcmBuffer = Buffer.concat(pcmChunks);
    const wavBuffer = pcmToWav(pcmBuffer);

    // Save WAV to disk (optional – useful for debugging)
    const wavFilename = `esp32_${Date.now()}.wav`;
    const wavPath = path.join(UPLOADS_DIR, wavFilename);
    fs.writeFileSync(wavPath, wavBuffer);
    console.log(`[WS] Saved ${wavPath} (${wavBuffer.length} bytes)`);

    try {
        const prediction = await sendToAIService(wavBuffer, wavFilename);
        console.log('[AI Result]', JSON.stringify(prediction, null, 2));

        // Send result back to ESP32 / client
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: 'prediction', data: prediction }));
        }
    } catch (err) {
        console.error('[AI Error]', err.message);
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                event: 'error',
                message: err.response?.data || err.message
            }));
        }
    }
}

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀  Auscura Node Backend running`);
    console.log(`    HTTP  → http://0.0.0.0:${PORT}`);
    console.log(`    WS    → ws://0.0.0.0:${PORT}`);
    console.log(`    AI    → ${AI_SERVICE_URL}\n`);
});
