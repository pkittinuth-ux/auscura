import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Search, Loader2 } from "lucide-react";

const Analyzing = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => {
      const types = ["good", "warning", "bad", "error"];
      const result = types[Math.floor(Math.random() * types.length)];
      navigate(`/result/${result}`);
    }, 3000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-24 animate-fade-up">
        <div className="relative mb-10">
          <div className="absolute inset-0 gradient-hero blur-3xl opacity-30 rounded-full animate-pulse" />
          <div className="relative w-48 h-48 rounded-full gradient-card border border-border shadow-elegant flex items-center justify-center">
            <div className="absolute w-40 h-40 rounded-full border-4 border-primary/20 border-t-primary animate-spin-slow" />
            <div className="relative animate-spin-slow">
              <Search className="w-20 h-20 text-primary" strokeWidth={1.8} />
            </div>
          </div>
        </div>

        <h1 className="text-7xl font-bold tabular-nums bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-emerald-400">
          กำลังวิเคราะห์
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          AI กำลังประมวลผลเสียงปอดของคุณ โปรดรอสักครู่...
        </p>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          วิเคราะห์รูปแบบเสียงด้วย Deep Learning
        </div>

        <div className="mt-12 w-96 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full gradient-hero" style={{ animation: "fade-up 3s linear", width: "100%" }} />
        </div>
      </div>
    </Layout>
  );
};

export default Analyzing;
