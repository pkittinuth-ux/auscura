const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

// ================= ค่าคงที่ =================
const AUDIO_TOPIC = 'auscura/esp32/audio';
const COMMAND_TOPIC = 'auscura/esp32/command';

// ตัวแปรสำหรับ Parameter ของไฟล์เสียง (ต้องตรงกับที่ ESP32 ส่งมา)
const SAMPLE_RATE = 16000;    // 16,000 Hz
const BIT_DEPTH   = 16;       // 16-bit
const CHANNELS    = 1;        // Mono

// ================= State =================
let isRecording = false;
let audioChunks = [];
let totalBytesReceived = 0;

// ================= MQTT =================
console.log('Connecting to HiveMQ...');
const client = mqtt.connect('mqtt://broker.hivemq.com');

client.on('connect', () => {
  console.log('Connected to HiveMQ!');
  client.subscribe(AUDIO_TOPIC, (err) => {
    if (!err) console.log(`Subscribed to ${AUDIO_TOPIC}`);
  });
});

// ================= Message Handler =================
client.on('message', (topic, message) => {
  if (topic !== AUDIO_TOPIC) return;

  const text = message.toString();

  if (text === 'mqtt_start') {
    // --- เริ่มบันทึก ---
    console.log('\n[Recording Started] Receiving audio chunks...');
    isRecording = true;
    audioChunks = [];
    totalBytesReceived = 0;

  } else if (text === 'mqtt_end') {
    // --- สิ้นสุดการบันทึก ---
    if (!isRecording) return;
    isRecording = false;

    console.log(`[Recording Finished] Total received: ${(totalBytesReceived / 1024).toFixed(2)} KB`);
    
    // รวม chunk ทั้งหมดเป็น Buffer เดียว
    const pcmBuffer = Buffer.concat(audioChunks);

    // บันทึกไฟล์ .pcm (ข้อมูลดิบ)
    const pcmPath = path.join(__dirname, 'recording.pcm');
    fs.writeFileSync(pcmPath, pcmBuffer);
    console.log(`[Saved] recording.pcm (${pcmBuffer.length} bytes)`);

    // แปลงเป็น .wav และบันทึก
    const wavPath = path.join(__dirname, 'recording.wav');
    const wavBuffer = pcmToWav(pcmBuffer, SAMPLE_RATE, CHANNELS, BIT_DEPTH);
    fs.writeFileSync(wavPath, wavBuffer);
    console.log(`[Saved] recording.wav -> Ready to play!`);
    console.log('-------------------------------------------');

  } else if (isRecording) {
    // --- รับข้อมูลเสียงระหว่าง Start และ End ---
    // message ณ ตรงนี้คือ Buffer ข้อมูล Binary PCM
    audioChunks.push(Buffer.from(message));
    totalBytesReceived += message.length;
    process.stdout.write(`\r  Buffering... ${(totalBytesReceived / 1024).toFixed(1)} KB`);
  }
});

// ================= WAV Converter =================

/**
 * สร้าง WAV file จาก Raw PCM Buffer
 * โดยเพิ่ม Standard 44-byte WAV Header ที่หน้าไฟล์
 */
function pcmToWav(pcmBuffer, sampleRate, channels, bitDepth) {
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize; // ขนาดรวมของไฟล์ - 8 bytes

  const header = Buffer.alloc(44);

  // RIFF Chunk
  header.write('RIFF', 0);                         // ChunkID
  header.writeUInt32LE(chunkSize, 4);               // ChunkSize
  header.write('WAVE', 8);                          // Format

  // fmt Subchunk
  header.write('fmt ', 12);                         // Subchunk1ID
  header.writeUInt32LE(16, 16);                     // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);                      // AudioFormat (1 = PCM)
  header.writeUInt16LE(channels, 22);               // NumChannels
  header.writeUInt32LE(sampleRate, 24);             // SampleRate
  header.writeUInt32LE(byteRate, 28);               // ByteRate
  header.writeUInt16LE(blockAlign, 32);             // BlockAlign
  header.writeUInt16LE(bitDepth, 34);               // BitsPerSample

  // data Subchunk
  header.write('data', 36);                         // Subchunk2ID
  header.writeUInt32LE(dataSize, 40);               // Subchunk2Size

  return Buffer.concat([header, pcmBuffer]);
}

// ================= PING =================
setInterval(() => {
  if (client.connected) {
    client.publish(COMMAND_TOPIC, 'PING from Server');
  }
}, 10000);

client.on('error', (err) => {
  console.error('[Error] MQTT Client Error:', err.message);
});
