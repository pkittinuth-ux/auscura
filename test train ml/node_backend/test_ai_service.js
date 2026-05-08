/**
 * Test: Node → Python AI Service
 * Usage: node test_ai_service.js [path/to/audio.wav]
 *
 * Make sure the Python AI service is running first:
 *   cd ai_service && python app.py
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const AI_URL = 'http://127.0.0.1:8000';
const wavFile = process.argv[2] || path.join(__dirname, 'uploads', 'sample.wav');

// ── ANSI colors ───────────────────────────────────────────────────────────────
const c = {
    reset: '\x1b[0m',
    bold:  '\x1b[1m',
    green: '\x1b[32m',
    cyan:  '\x1b[36m',
    yellow:'\x1b[33m',
    red:   '\x1b[31m',
    gray:  '\x1b[90m',
};

function log(label, value, color = c.cyan) {
    console.log(`  ${color}${c.bold}${label}${c.reset}  ${value}`);
}

function separator(title = '') {
    const line = '─'.repeat(50);
    console.log(`\n${c.gray}${line}${c.reset}`);
    if (title) console.log(`${c.bold} ${title}${c.reset}`);
}

// ── Step 1: Health check ──────────────────────────────────────────────────────
async function healthCheck() {
    separator('STEP 1 — Health Check');
    try {
        const res = await axios.get(`${AI_URL}/health`, { timeout: 5000 });
        log('Status :', res.data.status, c.green);
        log('Service:', res.data.service, c.green);
        return true;
    } catch (err) {
        console.error(`${c.red}✖ Cannot reach AI service at ${AI_URL}${c.reset}`);
        console.error(`  ${c.red}${err.message}${c.reset}`);
        console.error(`\n  ${c.yellow}Make sure Python AI service is running:${c.reset}`);
        console.error(`  ${c.gray}cd ai_service && python app.py${c.reset}\n`);
        return false;
    }
}

// ── Step 2: Send WAV file ─────────────────────────────────────────────────────
async function sendWavFile(filePath) {
    separator('STEP 2 — Send WAV to /analyze');

    if (!fs.existsSync(filePath)) {
        console.error(`${c.red}✖ File not found: ${filePath}${c.reset}`);
        return;
    }

    const stats = fs.statSync(filePath);
    log('File    :', path.basename(filePath));
    log('Size    :', `${(stats.size / 1024).toFixed(1)} KB`);
    log('URL     :', `${AI_URL}/analyze`);

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
        filename: path.basename(filePath),
        contentType: 'audio/wav',
    });

    console.log(`\n  ${c.gray}Sending...${c.reset}`);
    const t0 = Date.now();

    try {
        const res = await axios.post(`${AI_URL}/analyze`, form, {
            headers: form.getHeaders(),
            timeout: 30000,
        });

        const elapsed = Date.now() - t0;
        separator('STEP 3 — AI Prediction Result');

        const d = res.data;
        log('✔ Label      :', d.label, c.green);
        log('  Type       :', d.type);
        log('  Severity   :', severityColor(d.severity) + d.severity + c.reset);
        log('  Confidence :', `${(d.confidence * 100).toFixed(1)}%`);
        log('  Message    :', d.result_message || '-');
        log('  Clinical   :', d.clinical_note || '-', c.gray);

        if (d.details) {
            separator('Details');
            log('  Location   :', d.details.location_detected);
            log('  Dom. Freq  :', d.details.dominant_freq_detected);
            log('  Segments   :', String(d.details.segments_analyzed));
        }

        separator();
        log('⏱ Response time:', `${elapsed} ms`, c.green);
        console.log(`\n${c.gray}Full JSON:${c.reset}`);
        console.log(JSON.stringify(d, null, 2));

    } catch (err) {
        separator('ERROR');
        console.error(`${c.red}✖ Request failed: ${err.message}${c.reset}`);
        if (err.response) {
            console.error(`  HTTP ${err.response.status}:`, JSON.stringify(err.response.data, null, 2));
        }
    }
}

function severityColor(s) {
    return { Good: c.green, Warning: c.yellow, Bad: c.red }[s] || '';
}

// ── Run ───────────────────────────────────────────────────────────────────────
(async () => {
    console.log(`\n${c.bold}${c.cyan}=== Auscura AI Service Test ===${c.reset}`);
    console.log(`${c.gray}  Target: ${AI_URL}${c.reset}`);

    const alive = await healthCheck();
    if (!alive) process.exit(1);

    await sendWavFile(wavFile);
})();
