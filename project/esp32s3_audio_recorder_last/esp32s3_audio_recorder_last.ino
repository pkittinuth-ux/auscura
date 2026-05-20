/*
 * ESP32-S3 Audio Recorder via WebSocket
 * Board  : ESP32-S3 N16R8 (16MB Flash, 8MB PSRAM)
 * Library: arduinoWebSockets by Markus Sattler
 *
 * Flow:
 *   IR Trigger → อัดเสียง 20 วิ ลง PSRAM → ส่ง WebSocket ทีละ Chunk → IDLE30
 *
 * ROOT CAUSE FIX:
 *   ถอด DFRobot_MSM261 ออกทั้งหมด — library มีบัคใน read() ที่ทำให้
 *   DMA descriptor pointer เสียหายจนชี้ไป 0x40404040 (Instruction Bus)
 *   → LoadStoreError crash ทุกครั้ง ไม่ว่าจะ align buffer ยังไงก็ตาม
 *
 *   แก้โดยใช้ ESP-IDF <driver/i2s.h> โดยตรง ซึ่ง:
 *   - จัดการ DMA ring buffer ภายในเอง
 *   - i2s_read() ทำ CPU-copy จาก DMA buffer → user buffer (ไม่ใช่ DMA-to-user)
 *   - user buffer เป็น global array ธรรมดาก็ทำงานได้
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <driver/i2s.h>

// ==================== WiFi ====================
const char* ssid     = "Keane";
const char* password = "Pasta1234";

// ==================== WebSocket ====================
const char* WS_HOST = "10.96.47.96";
const int   WS_PORT = 8888;
const char* WS_PATH = "/";

// ==================== I2S Microphone ====================
#define SAMPLE_RATE   16000
#define I2S_SCK_IO    41          // BCLK
#define I2S_WS_IO     42          // LRCLK
#define I2S_DI_IO      2          // DATA IN
#define MODE_PIN       15         // MSM261 L/R select: LOW = Left channel



// ==================== Recording ====================
#define RECORD_SECONDS   20
#define DMA_BUF_COUNT     8       // จำนวน DMA buffer blocks
#define DMA_BUF_LEN     256       // samples ต่อ 1 block
#define I2S_READ_SIZE  1024       // bytes อ่านต่อครั้ง (Stereo 16-bit = 4 bytes/frame × 256 frames)
#define AUDIO_BUF_SIZE (SAMPLE_RATE * RECORD_SECONDS * 2)  // Mono 16-bit = 640,000 bytes

// ==================== Sending ====================
#define SEND_CHUNK_SIZE  4096

// ==================== WebSocket ====================
WebSocketsClient webSocket;

// ==================== Buffers ====================
// รับข้อมูลจาก DFRobot (เหมือนโค้ดต้นฉบับของคุณเป๊ะ)
char i2sRawBuff[I2S_READ_SIZE];

// Buffer สำหรับสะสม 16-bit Mono ก่อนส่ง (ลดภาระ WebSocket ป้องกัน Packet Drop ที่ทำให้เสียงซ่า)
#define SEND_BUF_SIZE 4096
uint8_t sendBuf[SEND_BUF_SIZE];
size_t  sendBufIdx = 0;

// ==================== State Machine ====================
enum State { IDLE, RECORDING };
State currentState = IDLE;

unsigned long recordStartTime = 0;
bool wsConnected = false;

// Forward declarations for start/stop functions
void startRecording();
void finishRecording();

// ==================== WebSocket Callback ====================
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      wsConnected = true;
      Serial.println("[WS] Connected to server");
      break;
    case WStype_DISCONNECTED:
      wsConnected = false;
      Serial.println("[WS] Disconnected — will retry...");
      break;
    case WStype_TEXT: {
      String msg = "";
      for (size_t i = 0; i < length; i++) {
        msg += (char)payload[i];
      }
      msg.trim();
      Serial.printf("[WS] Server Command: %s\n", msg.c_str());

      if (msg == "start") {
        if (currentState == IDLE) {
          startRecording();
        }
      } else if (msg == "stop") {
        if (currentState == RECORDING) {
          if (sendBufIdx > 0) {
            webSocket.sendBIN(sendBuf, sendBufIdx);
            sendBufIdx = 0;
          }
          finishRecording();
        }
      }
      break;
    }
    case WStype_ERROR:
      Serial.println("[WS] Error occurred");
      break;
    default:
      break;
  }
}

// ==================== WiFi ====================
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
}

// ==================== WebSocket ====================
void initWebSocket() {
  webSocket.begin(WS_HOST, WS_PORT, WS_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
  Serial.printf("WebSocket → ws://%s:%d%s\n", WS_HOST, WS_PORT, WS_PATH);
}

// ==================== I2S ====================
void initI2S() {
  pinMode(MODE_PIN, OUTPUT);
  digitalWrite(MODE_PIN, LOW);

  Serial.print("Initializing I2S Microphone (Official ESP-IDF API)...");
  
  // การตั้งค่า I2S ตามมาตรฐานของ ESP32-S3 (ESP-IDF)
  i2s_config_t i2s_config = {
      .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
      .sample_rate = SAMPLE_RATE,
      .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT, // MSM261 สื่อสารที่ 32-bit ต่อ 1 sample
      .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,  // อ่านเฉพาะแชนเนลซ้าย (MODE_PIN = LOW)
      .communication_format = I2S_COMM_FORMAT_STAND_I2S, // มาตรฐาน I2S Philips
      .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,     // ระดับความสำคัญ Interrupt
      .dma_buf_count = DMA_BUF_COUNT,               // จำนวนบัฟเฟอร์ DMA
      .dma_buf_len = DMA_BUF_LEN,                   // ขนาดบัฟเฟอร์
      .use_apll = false,
      .tx_desc_auto_clear = false,
      .fixed_mclk = 0
  };

  i2s_pin_config_t pin_config = {
      .bck_io_num = I2S_SCK_IO,
      .ws_io_num = I2S_WS_IO,
      .data_out_num = I2S_PIN_NO_CHANGE, // ไม่ใช้ขาออปพุตเสียง (RX อย่างเดียว)
      .data_in_num = I2S_DI_IO
  };

  esp_err_t err = i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
  if (err != ESP_OK) {
    Serial.printf("\nFailed installing I2S driver: %d\n", err);
    while (true) delay(1000);
  }
  
  err = i2s_set_pin(I2S_NUM_0, &pin_config);
  if (err != ESP_OK) {
    Serial.printf("\nFailed setting I2S pins: %d\n", err);
    while (true) delay(1000);
  }
  
  i2s_zero_dma_buffer(I2S_NUM_0);
  Serial.println("\nI2S init success! (Official API)");
}

// ==================== PSRAM ====================
// ไม่ใช้ PSRAM แล้วเพื่อแก้ปัญหา Heap Corruption (เปลี่ยนมาใช้ Real-time Streaming แทน)

// ==================== State: RECORDING ====================
void startRecording() {
  recordStartTime = millis();
  currentState    = RECORDING;
  sendBufIdx      = 0;

  // แจ้ง Server ว่าจะเริ่มส่งไฟล์แล้วนะ (server.js รอคำว่า 'start')
  webSocket.sendTXT("start");

  Serial.println("\n[RECORDING & STREAMING] Started via WebSocket...");
}

void doRecording() {
  unsigned long elapsed = millis() - recordStartTime;

  // Safety timeout: 5 minutes max
  if (elapsed >= 300000) {
    Serial.println("[RECORDING] Safety timeout reached (5 minutes). Stopping...");
    if (sendBufIdx > 0) {
      webSocket.sendBIN(sendBuf, sendBufIdx);
      sendBufIdx = 0;
    }
    finishRecording();
    return;
  }

  // อ่านจาก I2S โดยใช้ ESP-IDF API อย่างเป็นทางการ
  size_t bytes_read = 0;
  i2s_read(I2S_NUM_0, i2sRawBuff, I2S_READ_SIZE, &bytes_read, portMAX_DELAY);

  // แปลงข้อมูลจาก 32-bit เป็น 16-bit PCM ที่ถูกต้อง
  int32_t* samples = (int32_t*)i2sRawBuff;
  size_t sample_count = bytes_read / 4;

  for (size_t i = 0; i < sample_count; i++) {
    // ข้อมูลเสียงของ I2S Microphone (MSM261) จะเป็น 32-bit โดยมีเนื้อเสียง 24-bit อัดอยู่ฝั่ง MSB (Most Significant Bit)
    // การ >> 14 (หรือ 12-16) เป็นวิธีมาตรฐาน (Bit shifting) ในการดึงเอาสัญญาณ 16-bit ออกมา
    int32_t sample32 = samples[i];
    int16_t sample16 = sample32 >> 14; 

    // เก็บเป็น 16-bit PCM (Little Endian) เพื่อเตรียมส่ง WebSocket
    sendBuf[sendBufIdx++] = sample16 & 0xFF;         // LSB
    sendBuf[sendBufIdx++] = (sample16 >> 8) & 0xFF;  // MSB

    // ถ้า Buffer เต็ม ส่งออกแบบ Chunk
    if (sendBufIdx >= SEND_BUF_SIZE) {
      while (!webSocket.sendBIN(sendBuf, sendBufIdx)) {
        webSocket.loop();
        delay(1);
        if (!wsConnected) break;
      }
      sendBufIdx = 0;
    }
  }

  // แสดงความคืบหน้าทุก 1 วิ
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint >= 1000) {
    lastPrint = millis();
    Serial.printf("  [REC & STREAM] %lu sec\n", elapsed / 1000);
  }
}

void finishRecording() {
  // แจ้ง Server ว่าส่งไฟล์เสร็จแล้ว (server.js รอคำว่า 'end')
  webSocket.sendTXT("end");
  Serial.println("[RECORDING] Complete! Sent 'end' to server.");

  currentState = IDLE;
  Serial.println("\nSystem Ready — Waiting for WebSocket command...");
}

// ==================== Setup ====================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("=== ESP32-S3 Audio Recorder ===");

  connectWiFi();

  // if (!initPSRAM()) {
  //   Serial.println("FATAL: PSRAM required. Halting.");
  //   while (true) delay(1000);
  // }

  // ใช้ ESP-IDF I2S driver โดยตรง — ไม่ต้องพึ่ง DFRobot library
  initI2S();

  initWebSocket();

  // รอให้ WS connect ก่อน (max 5 วิ)
  unsigned long t = millis();
  while (!wsConnected && millis() - t < 5000) {
    webSocket.loop();
    delay(100);
  }

  Serial.println("System Ready — Waiting for WebSocket command...");
}

// ==================== Loop ====================
void loop() {
  webSocket.loop();

  switch (currentState) {

    case IDLE:
      // Triggered via WebSocket callback asynchronously
      break;

    case RECORDING:
      doRecording();
      break;
  }
}
