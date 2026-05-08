import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
import os

# ข้อมูลรายละเอียดคลาสตามที่ผู้ใช้กำหนด (Enhanced Class Details)
CLASS_DETAILS = {
    'A': {
        'type': 'Vesicular (Normal)',
        'description': 'เสียงหายใจปกติ นุ่ม ต่อเนื่อง',
        'severity': 'Good',
        'recommendation': 'โดยรวมเสียงอยู่ในเกณฑ์ปกติค่ะ',
        'clinical_note': 'โดยทั่วไปไม่ชี้โรค',
        'freq_range': [100, 500]
    },
    'B': {
        'type': 'Normal',
        'description': 'ไม่พบเสียงผิดปกติเด่น',
        'severity': 'Good',
        'recommendation': 'ยังไม่พบเสียงผิดปกติเด่นชัดค่ะ',
        'clinical_note': 'โดยทั่วไปไม่ชี้โรค',
        'freq_range': [100, 1000]
    },
    'C': {
        'type': 'Bronchial',
        'description': 'เสียงแข็ง/ชัดกว่าปกติ (pattern เปลี่ยน)',
        'severity': 'Warning',
        'recommendation': 'พบรูปแบบเสียงที่ต่างจากปกติ แนะนำติดตาม/ประเมินเพิ่มเติมนะคะ',
        'clinical_note': 'ภาวะปอดทึบ/ปอดอักเสบ (consolidation) (ตัวอย่าง: pneumonia)',
        'freq_range': [200, 2000]
    },
    'D': {
        'type': 'Stridor',
        'description': 'เสียงแหลมดัง มักเด่นช่วงหายใจเข้า (upper airway)',
        'severity': 'Bad',
        'recommendation': 'พบเสียงแหลมคล้ายอุดกั้นทางเดินหายใจส่วนบน แนะนำให้พบแพทย์/ผู้เชี่ยวชาญโดยเร็วค่ะ',
        'clinical_note': 'อุดกั้นทางเดินหายใจส่วนบน เช่น croup/สิ่งแปลกปลอม/บวมกล่องเสียง',
        'freq_range': [500, 3000]
    },
    'E': {
        'type': 'Wheeze',
        'description': 'เสียงหวีดต่อเนื่อง (continuous, musical)',
        'severity': 'Warning',
        'recommendation': 'พบเสียงหวีดค่ะ อาจเกี่ยวกับหลอดลมตีบ แนะนำสังเกตอาการและประเมินเพิ่มเติม',
        'clinical_note': 'โรค/อาการกลุ่มหลอดลมตีบ เช่น Asthma, COPD, หลอดลมอักเสบ (bronchitis)',
        'freq_range': [400, 1600]
    },
    'F': {
        'type': 'Rhonchi',
        'description': 'เสียงต่ำครืดคราดต่อเนื่อง คล้ายเสมหะ/อุดกั้น',
        'severity': 'Warning',
        'recommendation': 'พบเสียงครืดคราดค่ะ อาจมีเสมหะ/การอุดกั้น แนะนำประเมินเพิ่มเติม',
        'clinical_note': 'หลอดลมอักเสบ (bronchitis), COPD, ภาวะมีเสมหะ',
        'freq_range': [50, 300]
    },
    'G': {
        'type': 'Fine Crackles',
        'description': 'เสียงแตกละเอียด เป็นเม็ดสั้น ๆ (discontinuous)',
        'severity': 'Warning',
        'recommendation': 'พบเสียงแตกละเอียดค่ะ แนะนำติดตาม/ตรวจเพิ่มเติมเพื่อความมั่นใจ',
        'clinical_note': 'ภาวะน้ำท่วมปอด/หัวใจล้มเหลว, โรคปอดคั่นระหว่าง, ปอดอักเสบ',
        'freq_range': [600, 2000]
    },
    'H': {
        'type': 'Coarse Crackles',
        'description': 'เสียงแตกหยาบ ดัง/หยาบกว่า fine crackles',
        'severity': 'Bad',
        'recommendation': 'พบเสียงแตกหยาบค่ะ ถ้ามีหอบ/ไข้/เหนื่อย แนะนำพบแพทย์',
        'clinical_note': 'ปอดอักเสบ, น้ำท่วมปอด, หลอดลมอักเสบ/เสมหะมาก',
        'freq_range': [300, 2000]
    },
    'I': {
        'type': 'Pleural Rub',
        'description': 'เสียงเสียดสี คล้ายถูหนัง มักได้ทั้งเข้า–ออก',
        'severity': 'Bad',
        'recommendation': 'พบเสียงเสียดสีค่ะ ถ้ามีเจ็บหน้าอก/หายใจลำบาก แนะนำพบแพทย์',
        'clinical_note': 'เยื่อหุ้มปอดอักเสบ (pleurisy), ปอดอักเสบ, ลิ่มเลือดอุดตันปอด',
        'freq_range': [100, 350]
    },
    'J': {
        'type': 'Squawks',
        'description': 'short wheeze สั้นช่วงหายใจเข้า มักมี crackles นำ',
        'severity': 'Warning',
        'recommendation': 'พบเสียงสั้นคล้าย squeak ค่ะ แนะนำประเมินเพิ่มเติม',
        'clinical_note': 'โรคปอดคั่นระหว่าง/ภูมิแพ้ปอด, ปอดอักเสบ (บางกรณี)',
        'freq_range': [200, 300]
    },
    'E+F': {
        'type': 'Wheeze + Rhonchi',
        'description': 'เสียงตีบ + เสมหะ/อุดกั้นร่วม',
        'severity': 'Bad',
        'recommendation': 'พบทั้งเสียงหวีดและเสียงครืดคราดค่ะ แนะนำประเมินเพิ่มเติม',
        'clinical_note': 'Asthma/COPD + bronchitis/เสมหะ',
        'freq_range': [50, 1600]
    },
    'E+G': {
        'type': 'Wheeze + Fine crackles',
        'description': 'ตีบ + แตกละเอียดหลายเม็ด',
        'severity': 'Bad',
        'recommendation': 'พบหลายกลไกพร้อมกันค่ะ แนะนำตรวจเพิ่มเติมเพื่อความปลอดภัย',
        'clinical_note': 'Asthma/COPD + pulmonary edema หรือ ILD หรือ pneumonia',
        'freq_range': [400, 2000]
    },
    'E+H': {
        'type': 'Wheeze + Coarse crackles',
        'description': 'ตีบ + แตกหยาบ/ของเหลว',
        'severity': 'Bad',
        'recommendation': 'พบเสียงหวีดร่วมเสียงแตกหยาบค่ะ แนะนำพบแพทย์ถ้ามีหอบ/ไข้/เหนื่อย',
        'clinical_note': 'Asthma/COPD + pneumonia/pulmonary edema',
        'freq_range': [300, 2000]
    },
    'F+H': {
        'type': 'Rhonchi + Coarse crackles',
        'description': 'เสมหะมาก + แตกหยาบ',
        'severity': 'Bad',
        'recommendation': 'เหมือนมีเสมหะร่วมกับเสียงแตกค่ะ แนะนำตรวจเพิ่ม',
        'clinical_note': 'bronchitis/COPD + pneumonia/edema',
        'freq_range': [50, 2000]
    },
    'G+I': {
        'type': 'Fine crackles + Pleural rub',
        'description': 'แตกละเอียด + เสียดสีเยื่อหุ้มปอด',
        'severity': 'Bad',
        'recommendation': 'พบเสียงแตกและเสียงเสียดสีร่วมกันค่ะ แนะนำพบแพทย์เพื่อประเมินสาเหตุ',
        'clinical_note': 'ILD/edema/pneumonia + pleurisy/pulmonary embolism',
        'freq_range': [100, 2000]
    },
    'J+G': {
        'type': 'Squawk + Fine crackles',
        'description': 'squawk มักมากับ crackles',
        'severity': 'Bad',
        'recommendation': 'พบเสียงสั้นร่วมกับเสียงแตกค่ะ แนะนำประเมินเพิ่มเติม',
        'clinical_note': 'hypersensitivity pneumonitis/ILD + pneumonia',
        'freq_range': [200, 2000]
    }
}

# สำหรับ Backward Compatibility กับโค้ดเก่า
CLASS_MAP = {k: v['type'] for k, v in CLASS_DETAILS.items()}

# Location Mapping
LOC_MAP = {
    'Al': 0, 'Ar': 1, 'Pl': 2, 'Pr': 3, 'Ll': 4, 'Lr': 5, 'Tc': 6
}

def map_icbhi_to_custom(crackles, wheezes, location='Al'):
    """
    Maps ICBHI binary labels + location to granular categories.
    """
    if crackles == 0 and wheezes == 0:
        if location == 'Tc':
            return 'C' # Bronchial
        return 'B' # Normal
    
    if crackles == 1 and wheezes == 0:
        return 'G' # Fine Crackles (Default, will be refined in inference)
    
    if crackles == 0 and wheezes == 1:
        if location in ['Tc', 'Ar']:
            return 'D' # Stridor
        return 'E' # Wheeze
    
    if crackles == 1 and wheezes == 1:
        return 'E+G'
        
    return 'B'

def build_model(X, y):
    """Trains an optimized RandomForest classifier."""
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y if len(np.unique(y)) > 1 else None)
    
    model = RandomForestClassifier(
        n_estimators=200, 
        max_depth=25, 
        random_state=42,
        class_weight='balanced'
    )
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    print("Classification Report:")
    print(classification_report(y_test, y_pred))
    
    return model

def save_model(model, path='lung_model.joblib'):
    # Ensure it saves in ai_service
    script_dir = os.path.dirname(os.path.abspath(__file__))
    abs_path = os.path.join(script_dir, path)
    joblib.dump(model, abs_path)
    print(f"Model saved to {abs_path}")

def load_model_file(path='lung_model.joblib'):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    abs_path = os.path.join(script_dir, path)
    if os.path.exists(abs_path):
        return joblib.load(abs_path)
    return None

if __name__ == "__main__":
    pass
