import { useNavigate, useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Smile, Meh, Frown, AlertOctagon, RotateCcw, Home, Activity, Play } from "lucide-react";
import { loadResults, type StepResult } from "@/lib/aiService";

type ResultType = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "E + F" | "E + G" | "E + H" | "F + H" | "G + I" | "D + A" | "D + B" | "D + C" | "D + E" | "D + F" | "D + G" | "D + H" | "D + I" | "D + J" | "J + G" | "error";

const config: Record<ResultType, {
  label: string;
  Icon: typeof Smile;
  color: string;
  bg: string;
  message: string;
}> = {
  A: {
    label: "Good",
    Icon: Smile,
    color: "hsl(var(--success))",
    bg: "bg-success/10",
    message: "เสียงปอดคุณปกติ (Vescular) ไม่มีความเสี่ยงโรคปอด",
  },
  B: {
    label: "Good",
    Icon: Smile,
    color: "hsl(var(--success))",
    bg: "bg-success/10",
    message: "เสียงปอดคุณปกติ (Normal) ไม่มีความเสี่ยงโรคปอด",
  },
  C: {
    label: "Warning",
    Icon: Meh,
    color: "hsl(var(--warning))",
    bg: "bg-warning/10",
    message: "เสียงปอดคุณมีแนวโน้มผิดปกติเล็กน้อย (Bronchial) มีความเสี่ยงเป็น ภาวะปอดทึบ/อักเสบ",
  },
  D: {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "เสียงปอดของคุณผิดปกติ (Stridor) มีความเสี่ยงเป็น croup/สิ่งแปลกปลอม/บวมกล่องเสียง (อาการ: หายใจลำบาก)",
  },
  E: {
    label: "Warning",
    Icon: Meh,
    color: "hsl(var(--warning))",
    bg: "bg-warning/10",
    message: "เสียงปอดคุณมีแนวโน้มผิดปกติเล็กน้อย (Wheeze) มีความเสี่ยงเป็นโรคหลอดลมตีบ",
  },
  F: {
    label: "Warning",
    Icon: Meh,
    color: "hsl(var(--warning))",
    bg: "bg-warning/10",
    message: "เสียงปอดคุณมีแนวโน้มผิดปกติเล็กน้อ (Rhonchi) มีความเสี่ยงเป็น หลอดลมอักเสบ (bronchitis), COPD, ภาวะมีเสมหะ (อาการ: ไอมีเสมหะ)",
  },
  G: {
    label: "Warning",
    Icon: Meh,
    color: "hsl(var(--warning))",
    bg: "bg-warning/10",
    message: "เสียงปอดคุณมีแนวโน้มผิดปกติเล็กน้อ (Fine Crackles) มีความเสี่ยงเป็น ภาวะน้ำท่วมปอด/หัวใจล้มเหลว, โรคปอดคั่นระหว่าง, ปอดอักเสบ",
  },
  H: {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "พบเสียงแตกหยาบค่ะ ถ้ามีหอบ/ไข้/เหนื่อย แนะนำพบแพทย์",
  },
  I: {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "พบเสียงเสียดสีค่ะ ถ้ามีเจ็บหน้าอก/หายใจลำบาก แนะนำพบแพทย์",
  },
  J: {
    label: "Warning",
    Icon: Meh,
    color: "hsl(var(--warning))",
    bg: "bg-warning/10",
    message: "พบเสียงสั้นคล้าย squeak ค่ะ แนะนำประเมินเพิ่มเติม",
  },
  "E + F": {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "พบทั้งเสียงหวีดและเสียงครืดคราดค่ะ แนะนำประเมินเพิ่มเติม",
  },
  "E + G": {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "พบหลายกลไกพร้อมกันค่ะ แนะนำตรวจเพิ่มเติมเพื่อความปลอดภัย",
  },
  "E + H": {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "พบเสียงหวีดร่วมเสียงแตกหยาบค่ะ แนะนำพบแพทย์ถ้ามีหอบ/ไข้/เหนื่อย",
  },
  "F + H": {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "เหมือนมีเสมหะร่วมกับเสียงแตกค่ะ แนะนำตรวจเพิ่ม",
  },
  "G + I": {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "พบเสียงแตกและเสียงเสียดสีร่วมกันค่ะ แนะนำพบแพทย์เพื่อประเมินสาเหตุ",
  },
  "D + A": {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "เสียงปอดของคุณผิดปกติ (Stridor + Normal) มีความเสี่ยงเป็น croup/สิ่งแปลกปลอม/บวมกล่องเสียง",
  },
  "D + B": {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "เสียงปอดของคุณผิดปกติ (Stridor + Normal) มีความเสี่ยงเป็น croup/สิ่งแปลกปลอม/บวมกล่องเสียง",
  },
  "D + C": {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "เสียงปอดของคุณผิดปกติ (Stridor + Atelectasis) มีความเสี่ยงเป็น croup/สิ่งแปลกปลอม/บวมกล่องเสียง + atelectasis",
  },
  "D + E": {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "เสียงปอดของคุณผิดปกติ (Stridor + Wheezing) มีความเสี่ยงเป็น croup/สิ่งแปลกปลอม/บวมกล่องเสียง + Asthma/COPD",
  },
  "D + F": {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "เสียงปอดของคุณผิดปกติ (Stridor + Rhonchi) มีความเสี่ยงเป็น croup/สิ่งแปลกปลอม/บวมกล่องเสียง + bronchitis/เสมหะ",
  },
  "D + G": {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "เสียงปอดของคุณผิดปกติ (Stridor + Fine Crackles) มีความเสี่ยงเป็น croup/สิ่งแปลกปลอม/บวมกล่องเสียง + pulmonary edema/CHF",
  },
  "D + H": {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "เสียงปอดของคุณผิดปกติ (Stridor + Coarse Crackles) มีความเสี่ยงเป็น croup/สิ่งแปลกปลอม/บวมกล่องเสียง + pneumonia",
  },
  "D + I": {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "เสียงปอดของคุณผิดปกติ (Stridor + Pleural Friction Rub) มีความเสี่ยงเป็น croup/สิ่งแปลกปลอม/บวมกล่องเสียง + pleurisy",
  },
  "D + J": {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "เสียงปอดของคุณผิดปกติ (Stridor + Squawks) มีความเสี่ยงเป็น croup/สิ่งแปลกปลอม/บวมกล่องเสียง + hypersensitivity pneumonitis",
  },
  "J + G": {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "พบเสียงสั้นร่วมกับเสียงแตกค่ะ แนะนำประเมินเพิ่มเติม",
  },
  error: {
    label: "Error",
    Icon: AlertOctagon,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "โปรดลองใหม่อีกครั้ง ระบบไม่สามารถวิเคราะห์เสียงได้",
  },
};

const STEP_LABELS = ["อก ขวา บน", "อก ซ้าย บน", "อก ขวา ล่าง", "อก ซ้าย ล่าง"];
const SEV_COLOR: Record<string, string> = {
  Good: "text-success",
  Warning: "text-yellow-500",
  Bad: "text-destructive",
};
const SEV_BG: Record<string, string> = {
  Good: "bg-success/10 border-success/30",
  Warning: "bg-yellow-500/10 border-yellow-500/30",
  Bad: "bg-destructive/10 border-destructive/30",
};

const Result = () => {
  const { type = "A" } = useParams();
  const navigate = useNavigate();
  const r = config[type as ResultType] || config.A;
  const { Icon } = r;

  const results: StepResult[] = loadResults();
  const hasRealData = results.length > 0;

  const sessionRaw = typeof window !== "undefined" ? sessionStorage.getItem("auscura_session") : null;
  const sessionData: Record<number, { url: string; name: string }> = sessionRaw ? JSON.parse(sessionRaw) : {};


  // Find the representative result to show in the detailed card
  const repResult = hasRealData
    ? [...results].sort((a, b) => {
      const rank: Record<string, number> = { Good: 0, Warning: 1, Bad: 2 };
      const rankA = a.prediction ? (rank[a.prediction.severity] ?? 0) : -1;
      const rankB = b.prediction ? (rank[b.prediction.severity] ?? 0) : -1;
      return rankB - rankA;
    })[0]
    : null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-fade-up">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">ผลการวิเคราะห์</div>
          <h1 className="text-5xl font-bold">สรุปผลตรวจเสียงปอด</h1>
        </div>

        {/* Overall result card */}
        <div className="bg-card rounded-3xl p-12 shadow-elegant border border-border/50 text-center mb-8">
          <div
            className={`mx-auto w-40 h-40 rounded-full ${r.bg} flex items-center justify-center mb-8 animate-fade-up`}
            style={{ animationDelay: "0.1s" }}
          >
            <Icon className="w-24 h-24" style={{ color: r.color }} strokeWidth={1.5} />
          </div>

          <div
            className="inline-block px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider mb-6"
            style={{ backgroundColor: r.color, color: "white" }}
          >
            {r.label}
          </div>

          <p className="text-2xl text-foreground leading-relaxed max-w-xl mx-auto mb-4">
            {/* Use AI result_message from worst result if available */}
            {hasRealData
              ? results
                .filter((s) => s.prediction)
                .sort((a, b) => {
                  const rank = { Good: 0, Warning: 1, Bad: 2 };
                  return (rank[b.prediction!.severity] ?? 0) - (rank[a.prediction!.severity] ?? 0);
                })[0]?.prediction?.result_message ?? r.message
              : r.message}
          </p>

          {type === "error" && (
            <Button
              size="lg"
              onClick={() => navigate("/")}
              className="gradient-hero h-12 px-8 mb-4"
            >
              <Home className="mr-2 w-4 h-4" /> กลับหน้าแรก
            </Button>
          )}
        </div>

        {/* Step Result Details (Single Card Case) */}
        {hasRealData && repResult && (
          <div className="mb-8 text-left animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-2xl font-bold mb-4 px-2 text-foreground text-center">รายละเอียดเสียงบันทึกปอด</h2>
            <div className="max-w-md mx-auto">
              {(() => {
                const audioUrl = sessionData[repResult.step]?.url || Object.values(sessionData)[0]?.url;

                return (
                  <div
                    className={`bg-card rounded-2xl p-6 border shadow-elegant flex flex-col gap-4 ${repResult.prediction ? SEV_BG[repResult.prediction.severity] : "border-border"
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-semibold text-muted-foreground mb-1">
                          ตรวจผ่านสายฟังเสียงปอด (รวมทุกตำแหน่ง)
                        </div>
                        <div className="text-xl font-bold">
                          {repResult.prediction ? repResult.prediction.type : repResult.error ? "ข้อผิดพลาด" : "ไม่ทราบผล"}
                        </div>
                        {repResult.prediction && (
                          <div className={`text-sm font-semibold mt-1 ${SEV_COLOR[repResult.prediction.severity]}`}>
                            {repResult.prediction.label}
                          </div>
                        )}
                      </div>
                      {repResult.prediction && (
                        <div className={`p-2.5 rounded-full ${repResult.prediction.severity === "Bad" ? "bg-destructive/20 text-destructive" : repResult.prediction.severity === "Warning" ? "bg-yellow-500/20 text-yellow-500" : "bg-success/20 text-success"}`}>
                          <Activity className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    {audioUrl && (
                      <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-center gap-2 py-3 px-4 bg-muted/50 rounded-xl border border-dashed border-border text-muted-foreground select-none">
                        <Play className="w-4 h-4 opacity-40" />
                        <span className="text-xs font-semibold tracking-wider uppercase">Working On</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <div className="mt-4 text-center">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-14 px-10 text-base font-semibold border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-smooth"
          >
            <Link to="/">
              <RotateCcw className="mr-2 w-5 h-5" /> ทดสอบอีกครั้ง
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Result;
