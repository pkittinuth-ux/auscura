import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Search, Loader2, CheckCircle, XCircle } from "lucide-react";
import {
  analyzeWav,
  loadResults,
  saveResults,
  type StepResult,
} from "@/lib/aiService";

const STEP_LABELS = ["อก ขวา บน", "อก ซ้าย บน", "อก ขวา ล่าง", "อก ซ้าย ล่าง"];

const Analyzing = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [progressPct, setProgressPct] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function runAnalysis() {
      const SESSION_KEY = "auscura_session";
      const raw = sessionStorage.getItem(SESSION_KEY);
      const session: Record<number, { url: string; name: string }> = raw
        ? JSON.parse(raw)
        : {};

      const results: StepResult[] = [];
      const steps = Object.keys(session).map(Number).sort();

      if (steps.length === 0) {
        // No files uploaded – navigate with mock result
        navigate("/result/error");
        return;
      }

      for (let i = 0; i < steps.length; i++) {
        if (cancelled) return;
        const step = steps[i];
        const { url, name } = session[step];

        setCurrentStep(i);
        setStatus((s) => [...s, `กำลังวิเคราะห์ตำแหน่ง ${STEP_LABELS[step] ?? step + 1}...`]);

        try {
          // Fetch the object URL back as a Blob then send to AI
          const blobRes = await fetch(url);
          const blob = await blobRes.blob();
          const file = new File([blob], name, { type: "audio/wav" });

          const prediction = await analyzeWav(file, name);

          results.push({ step, filename: name, prediction });
          setStatus((s) => [
            ...s,
            `✓ ตำแหน่ง ${STEP_LABELS[step] ?? step + 1}`,
          ]);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          results.push({ step, filename: name, prediction: null, error: msg });
          setStatus((s) => [...s, `✗ ตำแหน่ง ${STEP_LABELS[step] ?? step + 1}: ${msg}`]);
        }

        setProgressPct(Math.round(((i + 1) / steps.length) * 100));
      }

      if (cancelled) return;

      saveResults(results);

      // Determine overall severity from all predictions
      const ranks: Record<string, number> = { Good: 0, Warning: 1, Bad: 2 };
      let worstRank = -1;
      for (const r of results) {
        if (r.prediction) {
          const rank = ranks[r.prediction.severity] ?? 0;
          if (rank > worstRank) worstRank = rank;
        }
      }

      // Find the best label to represent the overall result (the one with the worst severity)
      let worstLabel = "A";
      for (const r of results) {
        if (r.prediction) {
          const rank = ranks[r.prediction.severity] ?? 0;
          if (rank === worstRank) {
            worstLabel = r.prediction.label;
            break;
          }
        }
      }

      // Normalize label (e.g., "E+F" -> "E + F") to match Result.tsx config keys
      const route = worstRank >= 0 ? worstLabel.replace(/\+/g, " + ") : "error";

      setTimeout(() => {
        if (!cancelled) navigate(`/result/${route}`);
      }, 800);
    }

    runAnalysis();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-16 animate-fade-up">
        <div className="relative mb-10">
          <div className="absolute inset-0 gradient-hero blur-3xl opacity-30 rounded-full animate-pulse" />
          <div className="relative w-48 h-48 rounded-full gradient-card border border-border shadow-elegant flex items-center justify-center">
            <div className="absolute w-40 h-40 rounded-full border-4 border-primary/20 border-t-primary animate-spin-slow" />
            <div className="relative animate-spin-slow">
              <Search className="w-20 h-20 text-primary" strokeWidth={1.8} />
            </div>
          </div>
        </div>

        <h1 className="text-5xl font-bold tabular-nums bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-emerald-400 mb-2">
          กำลังวิเคราะห์
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          AI กำลังประมวลผลเสียงปอดของคุณ โปรดรอสักครู่...
        </p>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          วิเคราะห์รูปแบบเสียงด้วย Machine Learning
        </div>

        {/* Progress bar */}
        <div className="w-96 h-2 rounded-full bg-muted overflow-hidden mb-6">
          <div
            className="h-full gradient-hero transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground mb-8">{progressPct}%</div>

        {/* Step log */}
        <div className="w-full max-w-md bg-card rounded-2xl border border-border/50 p-4 space-y-2">
          {status.map((line, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              {line.startsWith("✓") ? (
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              ) : line.startsWith("✗") ? (
                <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              ) : (
                <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0 mt-0.5" />
              )}
              <span className={
                line.startsWith("✓") ? "text-success" :
                  line.startsWith("✗") ? "text-destructive" :
                    "text-muted-foreground"
              }>
                {line.replace(/^[✓✗] /, "")}
              </span>
            </div>
          ))}
          {status.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-2">กำลังเริ่มต้น...</div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Analyzing;
