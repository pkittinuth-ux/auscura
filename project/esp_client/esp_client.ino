#include <WiFi.h>
#include <PubSubClient.h>
#include "DFrobot_MSM261.h"

// ================= กำหนดค่าต่างๆ =================
const char* ssid = "GDD_WiFi_01 2.4G";
const char* password = "gddcoding2024";

const char* mqtt_server = "broker.hivemq.com"; 
const int   mqtt_port = 1883;

// ตั้งค่าไมโครโฟน I2S
#define SAMPLE_RATE     (16000)
#define I2S_SCK_IO      (25)
#define I2S_WS_IO       (32)
#define I2S_DI_IO       (26)
#define DATA_BIT        (16)
#define MODE_PIN        (4)

// ตั้งค่า IR Sensor (ปรับ Pin ตามวงจรของคุณได้เลย)
#define IR_PIN          (14)
#define RECORD_DURATION (5000) // มิลลิวินาที (5 วินาที)

DFRobot_Microphone microphone(I2S_SCK_IO, I2S_WS_IO, I2S_DI_IO);
WiFiClient espClient;
PubSubClient client(espClient);

const int BUFFER_SIZE = 1024;
char i2sReadrawBuff[BUFFER_SIZE];
uint8_t monoPCM[BUFFER_SIZE / 2];

// ============ State Machine ============
enum State { IDLE, RECORDING };
State currentState = IDLE;
unsigned long recordStartTime = 0;

// ================= WiFi =================

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
}

// ================= Microphone =================

void initMicrophone() {
  pinMode(MODE_PIN, OUTPUT);
  digitalWrite(MODE_PIN, LOW);
  while(microphone.begin(SAMPLE_RATE, DATA_BIT) != 0){
    Serial.println("I2S init failed, retrying...");
    delay(1000);
  }
  Serial.println("I2S init success!");
}

// ================= MQTT =================

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println("[Command from Server] " + message);
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      client.subscribe("auscura/esp32/command");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void initMQTT() {
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  client.setBufferSize(2048);
}

// ================= Audio =================

void readAndSendAudio() {
  microphone.read(i2sReadrawBuff, BUFFER_SIZE);

  // สกัดเฉพาะ Left Channel เป็น 16-bit Mono PCM
  int monoIndex = 0;
  for(int i = 0; i < BUFFER_SIZE; i += 4) {
    monoPCM[monoIndex++] = i2sReadrawBuff[i];
    monoPCM[monoIndex++] = i2sReadrawBuff[i+1];
  }

  // ส่งข้อมูลเสียงแบบ Binary
  client.publish("auscura/esp32/audio", monoPCM, monoIndex);
}

// ================= Setup =================

void setup() {
  Serial.begin(115200);
  
  pinMode(IR_PIN, INPUT);   // ตั้ง IR Sensor เป็น Input
  
  connectWiFi();
  initMicrophone();
  initMQTT();
  
  Serial.println("System Ready. Waiting for IR trigger...");
}

// ================= Loop =================

void loop() {
  // รักษาการเชื่อมต่อ MQTT ให้ต่อเนื่อง
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  // ============ State Machine ============
  if (currentState == IDLE) {
    // *** รอ IR Trigger: Sensor ส่งออก LOW เมื่อตรวจพบวัตถุ ***
    if (digitalRead(IR_PIN) == LOW) {
      Serial.println("\n[IR Triggered!] Starting 5-second recording...");
      
      // ส่งสัญญาณ Start ไปยัง Server
      client.publish("auscura/esp32/audio", "mqtt_start");
      
      recordStartTime = millis();
      currentState = RECORDING;
      
      // Debounce: รอให้มือพ้นก่อนค่อยเริ่ม
      delay(300);
    }

  } else if (currentState == RECORDING) {
    unsigned long elapsed = millis() - recordStartTime;
    
    if (elapsed < RECORD_DURATION) {
      // ยังอยู่ในช่วง 5 วินาที ให้ส่งข้อมูลเสียงไปเรื่อยๆ
      readAndSendAudio();
      
      // แสดงความคืบหน้า
      if (elapsed % 1000 < 100) {
        Serial.printf("  Recording... %.1f sec / 10.0 sec\n", elapsed / 1000.0);
      }
    } else {
      // ครบ 5 วินาทีแล้ว ส่งสัญญาณ End
      Serial.println("[Recording Done!] Sending mqtt_end...");
      client.publish("auscura/esp32/audio", "mqtt_end");
      
      currentState = IDLE;
      Serial.println("System Ready. Waiting for IR trigger...");
    }
  }
}
