import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Play, Square, Volume2 } from "lucide-react";
import { playSound, type SoundKey } from "@/lib/soundPlayer";

interface Row {
  key: SoundKey;
  name: string;
  thai: string;
  desc: string;
  category: "ปกติ" | "ผิดปกติ";
}

const rows: Row[] = [
  { key: "vesicular", name: "Vesicular", thai: "เสียงหายใจเข้ายาว-ออกสั้น", desc: "เสียงนุ่มนวลและต่ำ พบได้เกือบพื้นที่ปอดทั้งหมด", category: "ปกติ" },
  { key: "normal", name: "Normal", thai: "เสียงปกติทั่วไป", desc: "มีความสม่ำเสมอ นุ่มนวล และไม่มีเสียงแทรกซ้อน", category: "ปกติ" },
  { key: "bronchial", name: "Bronchial", thai: "เสียงหายใจเข้าสั้น-ออกยาว", desc: "เสียงดังแหลมและชัดเจน ได้ยินบริเวณเหนือกระดูกหน้าอก (Sternum) ความถี่สูงกว่า 200 Hz อาจสูงถึง 2,000 Hz", category: "ปกติ" },
  { key: "stridor", name: "Stridor", thai: "เสียงตีบทางเดินหายใจส่วนบน", desc: "เสียงแหลมสูงจากการตีบแคบของ Larynx หรือ Trachea ได้ยินชัดขณะหายใจเข้า เป็นภาวะอุดกั้นที่อาจอันตรายถึงชีวิต", category: "ผิดปกติ" },
  { key: "wheezing", name: "Wheezing", thai: "เสียงวี๊ด", desc: "เสียงสูงจากหลอดลมตีบ เช่น โรคหอบหืด", category: "ผิดปกติ" },
  { key: "rhonchi", name: "Rhonchi", thai: "เสียงครืดคราด", desc: "เสียงต่ำคล้ายมีเสมหะในหลอดลม", category: "ผิดปกติ" },
  { key: "fineCrackles", name: "Fine Crackles", thai: "เสียงกรอบแกรบเบา", desc: "เสียงแหลมสูงและเบา คล้ายเสียงลอกแถบ Velcro ออกช้าๆ หรือขยี้เส้นผมข้างหู", category: "ผิดปกติ" },
  { key: "coarseCrackles", name: "Coarse Crackles", thai: "เสียงกรอบแกรบหนัก", desc: "เสียงทุ้มต่ำและดัง คล้ายเสียงฟองอากาศแตก หรือเป่าหลอดลงในน้ำ", category: "ผิดปกติ" },
  { key: "pleuralRub", name: "Pleural Rub", thai: "เสียงเยื่อหุ้มปอดเสียดสี", desc: "เกิดจากการอักเสบของเยื่อหุ้มปอด ทำให้ผิวขรุขระเสียดสีกันขณะหายใจ", category: "ผิดปกติ" },
  { key: "squawks", name: "Squawks", thai: "เสียงนกหวีดสั้น", desc: "เสียงแหลมคล้ายเสียงนกหวีดสั้นๆ หรือเสียงฟองอากาศแตกตัว", category: "ผิดปกติ" },
];

const Sounds = () => {
  const [playing, setPlaying] = useState<SoundKey | null>(null);
  const [stopFn, setStopFn] = useState<(() => void) | null>(null);

  const toggle = (key: SoundKey) => {
    if (playing === key) {
      stopFn?.();
      setPlaying(null);
      setStopFn(null);
      return;
    }
    stopFn?.();
    const stop = playSound(key);
    setPlaying(key);
    setStopFn(() => stop);
    // auto stop after ~4.5s
    setTimeout(() => {
      setPlaying((p) => (p === key ? null : p));
    }, 4500);
  };

  return (
    <Layout>
      <div className="text-center mb-10 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold mb-4">
          <Volume2 className="w-3.5 h-3.5" /> ห้องสมุดเสียงปอด
        </div>
        <h1 className="text-5xl font-bold mb-3">เสียงประเภทต่างๆ</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          ทำความเข้าใจกับเสียงปอดแต่ละประเภท คลิกที่ปุ่ม Play เพื่อฟังเสียงตัวอย่างที่สังเคราะห์ขึ้น
        </p>
      </div>

      <div className="bg-card rounded-3xl shadow-elegant border border-border/50 overflow-hidden animate-fade-up">
        <div className="grid grid-cols-[1fr_2fr_140px] gap-4 px-8 py-5 bg-muted/50 border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <div>ชื่อประเภทเสียง</div>
          <div>คำอธิบาย</div>
          <div className="text-center">ตัวอย่างเสียง</div>
        </div>
        {rows.map((r, i) => {
          const isPlaying = playing === r.key;
          return (
            <div
              key={r.key}
              className={`grid grid-cols-[1fr_2fr_140px] gap-4 px-8 py-6 items-center border-b border-border/50 last:border-b-0 transition-smooth hover:bg-accent/30 ${
                isPlaying ? "bg-accent/40" : ""
              }`}
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-foreground text-lg">{r.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      r.category === "ปกติ" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {r.category}
                  </span>
                </div>
                <div className="text-sm text-primary font-medium">{r.thai}</div>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed">{r.desc}</div>
              <div className="flex justify-center">
                <Button
                  onClick={() => toggle(r.key)}
                  size="sm"
                  className={`rounded-full h-11 w-11 p-0 transition-smooth ${
                    isPlaying ? "bg-destructive hover:bg-destructive/90" : "gradient-hero"
                  }`}
                  aria-label={isPlaying ? "หยุดเสียง" : "เล่นเสียง"}
                >
                  {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        * เสียงตัวอย่างถูกสังเคราะห์ขึ้นเพื่อการศึกษาเท่านั้น ไม่ได้แทนเสียงจากผู้ป่วยจริง
      </p>
    </Layout>
  );
};

export default Sounds;
