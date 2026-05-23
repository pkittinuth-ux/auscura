import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import ChestDiagram from "@/components/ChestDiagram";
import { Mic } from "lucide-react";

const positions = [
  { code: "RUL" as const, title: "ตำแหน่งที่ 1", desc: "อก ขวา บน" },
  { code: "LUL" as const, title: "ตำแหน่งที่ 2", desc: "อก ซ้าย บน" },
  { code: "RML" as const, title: "ตำแหน่งที่ 3", desc: "อก ขวา ล่าง" },
  { code: "LLL" as const, title: "ตำแหน่งที่ 4", desc: "อก ซ้าย ล่าง" },
];

const Recording = () => {
  const { step = "0" } = useParams();
  const idx = Math.max(0, Math.min(3, parseInt(step, 10) || 0));
  const navigate = useNavigate();
  const pos = positions[idx];
  const [count, setCount] = useState(5);

  useEffect(() => {
    setCount(5);
    const interval = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setTimeout(() => {
            if (idx < 3) navigate(`/recording/${idx + 1}`);
            else navigate("/analyzing");
          }, 400);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [idx, navigate]);

  const progress = ((5 - count) / 5) * 100;
  const circumference = 2 * Math.PI * 90;

  return (
    <Layout>
      <div className="text-center mb-8 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" /> กำลังบันทึก
        </div>
        <h1 className="text-5xl font-bold mb-2">{pos.title}: {pos.desc}</h1>
        <p className="text-lg text-muted-foreground">หายใจลึกๆ 2 ครั้ง · รหัส {pos.code}</p>

        <div className="flex items-center justify-center gap-2 mt-6">
          {positions.map((p, i) => (
            <div
              key={p.code}
              className={`h-1.5 rounded-full transition-smooth ${
                i < idx ? "bg-success w-12" : i === idx ? "bg-primary w-20" : "bg-border w-12"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 items-center">
        <div className="animate-fade-up">
          <ChestDiagram active={pos.code} size={440} showMarkers />
        </div>

        <div className="flex flex-col items-center animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="relative">
            <svg width="240" height="240" className="-rotate-90">
              <circle cx="120" cy="120" r="90" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" />
              <circle
                cx="120" cy="120" r="90" fill="none"
                stroke="url(#grad)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (progress / 100) * circumference}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(188 78% 32%)" />
                  <stop offset="100%" stopColor="hsl(178 70% 45%)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Mic className="w-7 h-7 text-primary mb-2" />
              <div className="text-7xl font-bold tabular-nums bg-clip-text text-transparent gradient-hero">
                {count}
              </div>
              <div className="text-sm text-muted-foreground mt-1">วินาที</div>
            </div>
          </div>
          <p className="mt-8 text-center text-muted-foreground max-w-xs">
            <h2>วางหูฟัง ที่ตำแหน่ง <span className="font-bold text-primary">{pos.code}</span> และหายใจลึกๆ</h2>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Recording;
