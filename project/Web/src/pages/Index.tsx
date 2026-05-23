import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowRight, Activity, ShieldCheck, Stethoscope } from "lucide-react";
import lungs from "@/assets/lungs-hero.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");

  const canNext = age !== "" && gender !== "";

  return (
    <Layout>
      <section className="grid grid-cols-2 gap-16 items-center mb-20">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold mb-6">
            <Activity className="w-3.5 h-3.5" /> AI-POWERED LUNG SCREENING
          </div>
          <h1 className="text-6xl font-bold leading-[1.05] tracking-tight text-foreground mb-6">
            ตรวจเสียงปอดของคุณ<br />
            <span className="bg-gradient-to-r from-primary to-yellow-800 bg-clip-text text-transparent">ด้วย AI ที่แม่นยำ</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
            Auscura ใช้เซ็นเซอร์รับเสียงปอดร่วมกับปัญญาประดิษฐ์
            ในการวิเคราะห์เสียง wheeze, crackle, rhonchi และอื่นๆ
            เพื่อคัดกรองสุขภาพปอดของคุณอย่างเป็นระบบและเชื่อถือได้
          </p>

          <div className="bg-card rounded-2xl p-8 shadow-elegant border border-border/50">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              เริ่มต้นการตรวจ
            </h2>
            <div className="grid grid-cols-2 gap-5 mb-6">
              <div>
                <Label htmlFor="age" className="text-sm font-medium mb-2 block">อายุ</Label>
                <Select value={age} onValueChange={setAge}>
                  <SelectTrigger id="age" className="h-12">
                    <SelectValue placeholder="เลือกอายุ" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {Array.from({ length: 101 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>{i} ปี</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="gender" className="text-sm font-medium mb-2 block">เพศ</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="gender" className="h-12">
                    <SelectValue placeholder="เลือกเพศ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ชาย</SelectItem>
                    <SelectItem value="female">หญิง</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              size="lg"
              disabled={!canNext}
              onClick={() => navigate("/instructions")}
              className="w-full h-14 text-base font-semibold gradient-hero hover:opacity-95 transition-smooth shadow-soft"
            >
              Next <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="relative animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="absolute -inset-8 gradient-hero opacity-10 blur-3xl rounded-full" />
          <img
            src={lungs}
            alt="Realistic 3D rendering of human lungs"
            width={1024}
            height={1024}
            className="relative w-full h-auto animate-float drop-shadow-2xl"
          />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-6">
        {[
          { icon: ShieldCheck, title: "ปลอดภัยและเชื่อถือได้", desc: "เทคโนโลยีที่พัฒนาร่วมกับบุคลากรทางการแพทย์", grad: "gradient-hero" },
          { icon: Activity, title: "วิเคราะห์ด้วย AI", desc: "ตรวจจับเสียงปอดผิดปกติได้อย่างแม่นยำ", grad: "gradient-mint" },
          { icon: Stethoscope, title: "ใช้งานง่าย", desc: "เพียง 4 จุด ใน 5 นาที รู้ผลทันที", grad: "gradient-hero" },
        ].map(({ icon: Icon, title, desc, grad }) => (
          <div key={title} className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft transition-smooth hover:shadow-elegant hover:-translate-y-1">
            <div className={`w-12 h-12 rounded-xl ${grad} flex items-center justify-center mb-4`}>
              <Icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </section>
    </Layout>
  );
};

export default Index;
