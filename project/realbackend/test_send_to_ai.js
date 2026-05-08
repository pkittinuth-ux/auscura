/**
 * Test: Send recording.wav (ESP32 audio) → Python AI Service
 *
 * Prerequisites:
 *   1. AI Service must be running:
 *      cd "test train ml/ai_service" && python app.py
 *
 * Usage:
 *   node test_send_to_ai.js              <- uses recording.wav (default)
 *   node test_send_to_ai.js my_audio.wav <- custom file
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const http = require('http');

const AI_HOST = '127.0.0.1';
const AI_PORT = 8000;

// Use recording.wav from this folder by default
const wavFile = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(__dirname, 'recording.wav');

// ── Helpers ──────────────────────────────────────────────────────────────────
const SEV_COLOR = { Good: '\x1b[32m', Warning: '\x1b[33m', Bad: '\x1b[31m' };
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const GRAY  = '\x1b[90m';
const CYAN  = '\x1b[36m';
const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';

function line(label, value, color = CYAN) {
    console.log(`  ${color}${BOLD}${label.padEnd(15)}${RESET} ${value}`);
}

// ── Step 1: Health check (plain http, no axios needed) ─────────────────────
function healthCheck() {
    return new Promise((resolve) => {
        console.log(`\n${BOLD}${CYAN}=== Auscura AI Test ===${RESET}`);
        console.log(`${GRAY}  Target : http://${AI_HOST}:${AI_PORT}${RESET}`);
        console.log(`\n${GRAY}─────────────────────────────────────────${RESET}`);
        console.log(`${BOLD} STEP 1 — Health Check${RESET}`);

        const req = http.get(
            { host: AI_HOST, port: AI_PORT, path: '/health', timeout: 5000 },
            (res) => {
                let body = '';
                res.on('data', d => body += d);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(body);
                        line('Status :', json.status, GREEN);
                        line('Service:', json.service, GREEN);
                        resolve(true);
                    } catch {
                        console.error(`${RED}✖ Bad response from /health${RESET}`);
                        resolve(false);
                    }
                });
            }
        );
        req.on('error', () => {
            console.error(`${RED}✖ Cannot reach AI service at ${AI_HOST}:${AI_PORT}${RESET}`);
            console.error(`\n  ${'\x1b[33m'}Make sure Python AI service is running:${RESET}`);
            console.error(`  ${GRAY}cd "test train ml/ai_service" && python app.py${RESET}\n`);
            resolve(false);
        });
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

// ── Step 2: POST WAV to /analyze ────────────────────────────────────────────
function sendWav(filePath) {
    return new Promise((resolve, reject) => {
        console.log(`\n${GRAY}─────────────────────────────────────────${RESET}`);
        console.log(`${BOLD} STEP 2 — Send WAV to /analyze${RESET}`);

        if (!fs.existsSync(filePath)) {
            console.error(`${RED}✖ File not found: ${filePath}${RESET}`);
            return reject(new Error('File not found'));
        }

        const stats = fs.statSync(filePath);
        line('File    :', path.basename(filePath));
        line('Size    :', `${(stats.size / 1024).toFixed(1)} KB`);
        line('URL     :', `http://${AI_HOST}:${AI_PORT}/analyze`);

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath), {
            filename: path.basename(filePath),
            contentType: 'audio/wav',
        });

        const options = {
            host: AI_HOST,
            port: AI_PORT,
            path: '/analyze',
            method: 'POST',
            headers: form.getHeaders(),
            timeout: 30000,
        };

        console.log(`\n  ${GRAY}Sending...${RESET}`);
        const t0 = Date.now();

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                const elapsed = Date.now() - t0;
                try {
                    const json = JSON.parse(body);
                    resolve({ json, elapsed, status: res.statusCode });
                } catch {
                    reject(new Error(`Non-JSON response (HTTP ${res.statusCode}): ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });

        form.pipe(req);
    });
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
    const alive = await healthCheck();
    if (!alive) process.exit(1);

    let result;
    try {
        result = await sendWav(wavFile);
    } catch (err) {
        console.error(`\n${RED}✖ ${err.message}${RESET}`);
        process.exit(1);
    }

    const { json: d, elapsed, status } = result;

    if (status !== 200) {
        console.log(`\n${GRAY}─────────────────────────────────────────${RESET}`);
        console.log(`${BOLD}${RED} ERROR — HTTP ${status}${RESET}`);
        console.log(JSON.stringify(d, null, 2));
        process.exit(1);
    }

    console.log(`\n${GRAY}─────────────────────────────────────────${RESET}`);
    console.log(`${BOLD} STEP 3 — AI Prediction Result${RESET}`);

    const sevColor = SEV_COLOR[d.severity] || '';
    line('✔ Label    :', d.label, GREEN);
    line('  Type     :', d.type);
    line('  Severity :', `${sevColor}${BOLD}${d.severity}${RESET}`);
    line('  Confidence:', `${(d.confidence * 100).toFixed(1)}%`);
    line('  Message  :', d.result_message || '-');
    line('  Clinical :', d.clinical_note || '-', GRAY);

    if (d.details) {
        console.log(`\n${GRAY}─── Details ──${RESET}`);
        line('  Location :', d.details.location_detected);
        line('  Freq     :', d.details.dominant_freq_detected);
        line('  Segments :', String(d.details.segments_analyzed));
    }

    console.log(`\n${GRAY}─────────────────────────────────────────${RESET}`);
    line('⏱ Time     :', `${elapsed} ms`, GREEN);

    console.log(`\n${GRAY}Full JSON:${RESET}`);
    console.log(JSON.stringify(d, null, 2));
})();
