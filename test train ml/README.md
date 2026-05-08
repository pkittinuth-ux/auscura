# 🫁 ระบบจำแนกเสียงปอด (Lung Sound Classification)

ระบบนี้ถูกออกแบบมาเพื่อใช้จำแนกเสียงปอดออกเป็น 4 หมวดหมู่ (ตามชุดข้อมูล ICBHI) โดยจะสามารถนำไปใช้เชื่อมต่อกับ ESP32 ได้ตามที่คุณต้องการ

หมวดหมู่ของเสียง (Mapping ปัจจุบัน):
* **A** = Normal (ปกติ)
* **B** = Crackles (เสียงกรอบแกรบ - ผิดปกติ)
* **C** = Wheezes (เสียงวี้ด - ผิดปกติ)
* **D** = Both Crackles & Wheezes (พบทั้งสองอย่าง - ผิดปกติ)

## 📁 โครงสร้างโปรเจกต์
```text
/ (Project Root)
├── ai_service/             # ส่วนประมวลผล AI ด้วย Python
│   ├── api.py              # FastAPI Server
│   ├── train.py            # สคริปต์สำหรับเทรนโมเดลด้วย ICBHI Dataset
│   └── lung_model.joblib   # (ถูกสร้างขึ้นหลังเทรนเสร็จ)
├── node_backend/           # ส่วนของ Node.js Backend
│   ├── node_example.js     # ตัวอย่างการส่งไฟล์ไปที่ AI
│   ├── package.json        
│   └── uploads/            # โฟลเดอร์สำหรับเก็บไฟล์เสียงตัวอย่าง (.wav)
└── README.md
```

## 🛠️ การติดตั้ง

### Python (AI Service)
```bash
pip install librosa numpy pandas scikit-learn joblib kagglehub scipy fastapi uvicorn python-multipart
```

### Node.js (Backend)
```bash
cd node_backend
npm install
```

## 🚀 วิธีใช้งาน

### 1. ฝึกฝนโมเดล (Training)
```bash
cd ai_service
python train.py
```
> **หมายเหตุ:** ในการรันครั้งแรก สคริปต์จะทำการดาวน์โหลด Dataset จาก Kaggle และทำการสกัด Feature (MFCC) จากไฟล์เสียง ซึ่งอาจจะใช้เวลาหลายนาที เมื่อเสร็จแล้วจะได้ไฟล์ `lung_model.joblib`

### 2. รัน AI API Server
```bash
cd ai_service
python api.py
```
> Server จะรันอยู่ที่ `http://localhost:8000`

### 3. การทดสอบด้วย Node.js (Backend Integration)
1. นำไฟล์เสียง `.wav` จาก Dataset (หรืออัดจาก ESP32) ไปวางไว้ในโฟลเดอร์ `node_backend/uploads/` และตั้งชื่อว่า `sample.wav`
2. รันสคริปต์ตัวอย่าง:
```bash
cd node_backend
node node_example.js
```
