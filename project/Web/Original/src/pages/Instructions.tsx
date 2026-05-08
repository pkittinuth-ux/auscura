import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import ChestDiagram from "@/components/ChestDiagram";
import { Play, Info } from "lucide-react";

const positions = [
  { code: "RUL", title: "ตำแหน่งที่ 1", desc: "อก ขวา บน" },
  { code: "LUL", title: "ตำแหน่งที่ 2", desc: "อก ซ้าย บน" },
  { code: "RML", title: "ตำแหน่งที่ 3", desc: "อก ขวา ล่าง" },
  { code: "LLL", title: "ตำแหน่งที่ 4", desc: "อก ซ้าย ล่าง" },
];

const Instructions = () => {
  const navigate = useNavigate();
  return (
    <Layout>
      <div className="text-center mb-10 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold mb-4">
          <Info className="w-3.5 h-3.5" /> วิธีการใช้งาน
        </div>
        <h1 className="text-5xl font-bold mb-4">เตรียมพร้อมสำหรับการตรวจ</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          วางอุปกรณ์ตามจุดในภาพ <span className="font-semibold text-foreground">หายใจลึกๆ 2 ครั้งในแต่ละตำแหน่ง</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-12 items-center">
        <div className="animate-fade-up">
          <ChestDiagram size={440} />
        </div>
        <div className="space-y-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          {positions.map((p, i) => (
            <div
              key={p.code}
              className="flex items-center gap-5 p-5 bg-card rounded-2xl border border-border/50 shadow-soft transition-smooth hover:shadow-elegant"
            >
              <div className="w-14 h-14 rounded-xl gradient-hero text-primary-foreground font-bold text-lg flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">{p.title}: {p.desc}</div>
                <div className="text-sm text-muted-foreground">รหัสตำแหน่ง: {p.code}</div>
              </div>
              <div className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold">{p.code}</div>
            </div>
          ))}

          <Button
            size="lg"
            onClick={() => navigate("/recording/0")}
            className="w-full h-14 text-base font-semibold gradient-hero shadow-soft mt-4"
          >
            <Play className="mr-2 w-5 h-5 fill-current" /> Start
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Instructions;
