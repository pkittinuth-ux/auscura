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
  category: "GOOD" | "WARNING" | "BAD";
}

const rows: Row[] = [
  { key: "vesicular", name: "Vesicular", thai: "เสียงหายใจเข้ายาว-ออกสั้น", desc: "เสียงนุ่มนวลและต่ำ พบได้เกือบพื้นที่ปอดทั้งหมด", category: "GOOD" },
  { key: "normal", name: "Normal", thai: "เสียงปกติทั่วไป", desc: "มีความสม่ำเสมอ นุ่มนวล และไม่มีเสียงแทรกซ้อน", category: "GOOD" },
  { key: "bronchial", name: "Bronchial", thai: "เสียงหายใจเข้าสั้น-ออกยาว", desc: "เสียงดังแหลมและชัดเจน ได้ยินบริเวณเหนือกระดูกหน้าอก (Sternum) ความถี่สูงกว่า 200 Hz อาจสูงถึง 2,000 Hz", category: "WARNING" },
  { key: "bronchovesicular", name: "Bronchovesicular", thai: "เสียงหายใจเข้า-ออกเท่ากัน", desc: "เสียงปานกลาง ได้ยินบริเวณช่องว่างระหว่างกระดูกสะบัก", category: "WARNING" },
  { key: "stridor", name: "Stridor", thai: "เสียงตีบทางเดินหายใจส่วนบน", desc: "เสียงแหลมสูงจากการตีบแคบของ Larynx หรือ Trachea ได้ยินชัดขณะหายใจเข้า เป็นภาวะอุดกั้นที่อาจอันตรายถึงชีวิต", category: "BAD" },
  { key: "wheezing", name: "Wheezing", thai: "เสียงวี๊ด", desc: "เสียงสูงจากหลอดลมตีบ เช่น โรคหอบหืด", category: "WARNING" },
  { key: "rhonchi", name: "Rhonchi", thai: "เสียงครืดคราด", desc: "เสียงต่ำคล้ายมีเสมหะในหลอดลม", category: "WARNING" },
  { key: "fineCrackles", name: "Fine Crackles", thai: "เสียงกรอบแกรบเบา", desc: "เสียงแหลมสูงและเบา คล้ายเสียงลอกแถบ Velcro ออกช้าๆ หรือขยี้เส้นผมข้างหู", category: "WARNING" },
  { key: "coarseCrackles", name: "Coarse Crackles", thai: "เสียงกรอบแกรบหนัก", desc: "เสียงทุ้มต่ำและดัง คล้ายเสียงฟองอากาศแตก หรือเป่าหลอดลงในน้ำ", category: "BAD" },
  { key: "pleuralRub", name: "Pleural Rub", thai: "เสียงเยื่อหุ้มปอดเสียดสี", desc: "เกิดจากการอักเสบของเยื่อหุ้มปอด ทำให้ผิวขรุขระเสียดสีกันขณะหายใจ", category: "BAD" },
  { key: "squawks", name: "Squawks", thai: "เสียงนกหวีดสั้น", desc: "เสียงแหลมคล้ายเสียงนกหวีดสั้นๆ หรือเสียงฟองอากาศแตกตัว", category: "WARNING" },
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
    const stop = playSound(key, () => {
      setPlaying((p) => (p === key ? null : p));
      setStopFn(null);
    });
    setPlaying(key);
    setStopFn(() => stop);
  };

  return (
    <Layout>
      <div className="text-center mb-10 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold mb-4">
          <Volume2 className="w-3.5 h-3.5" /> ห้องสมุดเสียงปอด
        </div>
        <h1 className="text-5xl font-bold mb-3">เสียงประเภทต่างๆ</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          ทำความเข้าใจกับเสียงปอดแต่ละประเภท คลิกที่ปุ่ม Play เพื่อฟังเสียงตัวอย่างจริงจากผู้ป่วย
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
                      r.category === "GOOD" ? "bg-success/15 text-success" : r.category === "WARNING" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
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
        * เสียงตัวอย่างจากผู้ป่วยจริงเพื่อใช้ประกอบการศึกษาเท่านั้น
      </p>
    </Layout>
  );
};

export default Sounds;
