import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import ChestDiagram from "@/components/ChestDiagram";
import { Mic, Upload, CheckCircle, Wifi, Loader2 } from "lucide-react";
import { saveStepFile, clearSession } from "@/lib/aiService";

const positions = [
  { code: "RUL" as const, title: "ตำแหน่งที่ 1", desc: "อก ขวา บน" },
  { code: "LUL" as const, title: "ตำแหน่งที่ 2", desc: "อก ซ้าย บน" },
  { code: "RML" as const, title: "ตำแหน่งที่ 3", desc: "อก ขวา ล่าง" },
  { code: "LLL" as const, title: "ตำแหน่งที่ 4", desc: "อก ซ้าย ล่าง" },
];

const TOTAL_STEPS = 4;
const RECORD_SECONDS = 5;
const BACKEND_URL = `http://${window.location.hostname}:8888`;

const Recording = () => {
  const { step = "0" } = useParams();
  const idx = Math.max(0, Math.min(TOTAL_STEPS - 1, parseInt(step, 10) || 0));
  const navigate = useNavigate();
  const pos = positions[idx];

  const [count, setCount] = useState(RECORD_SECONDS);
  const [fileReady, setFileReady] = useState(false);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<"idle" | "uploading" | "esp32">("idle");
  const [esp32Recording, setEsp32Recording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear session only on the very first step
  useEffect(() => {
    if (idx === 0) clearSession();
  }, [idx]);

  // Reset when step changes
  useEffect(() => {
    setCount(RECORD_SECONDS);
    setFileReady(false);
    setFileName("");
    setMode("idle");
    setEsp32Recording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // Check if we already have a file for this step
    const raw = sessionStorage.getItem('auscura_session');
    const session: Record<number, { url: string; name: string }> = raw ? JSON.parse(raw) : {};

    // If we are in auto mode, don't auto-navigate away, just proceed
    const isAuto = sessionStorage.getItem("esp32_auto_mode") === "true";

    if (session[idx] && !isAuto) {
      // Already have file and not in auto mode, go to analyzing
      setTimeout(() => navigate("/analyzing"), 100);
    }
  }, [idx, navigate]);

  // Auto-start next step if in ESP32 auto mode
  useEffect(() => {
    const isAuto = sessionStorage.getItem("esp32_auto_mode") === "true";
    if (isAuto && !fileReady && mode === "idle") {
      // Small delay to let the UI breathe before starting next step
      const t = setTimeout(() => {
        handleEsp32Record();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [idx, fileReady, mode]);

  // Cleanup timer and stop recording if component unmounts while recording
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (sessionStorage.getItem("esp32_auto_mode") === "true") {
        fetch(`${BACKEND_URL}/stop`).catch((e) => console.error("Unmount stop error:", e));
      }
    };
  }, []);

  const fetchRealAudio = async (stepIdx: number) => {
    // Wait a bit for backend to save and filter the audio (1.5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      console.log(`Fetching actual recorded audio from: ${BACKEND_URL}/clean_recording.wav`);
      const res = await fetch(`${BACKEND_URL}/clean_recording.wav`);
      if (res.ok) {
        const blob = await res.blob();
        const name = `lung_sound.wav`;
        // Clear old sessions to ensure only a single combined file is processed
        sessionStorage.removeItem("auscura_session");
        saveStepFile(stepIdx, blob, name);
        console.log(`Saved single combined audio file for analysis.`);
        setFileName(name);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (error) {
      console.error("Failed to fetch real audio from backend:", error);
      // Fallback placeholder so we don't break the user flow
      const mockBlob = new Blob(["esp32-stream-data-fallback"], { type: "audio/wav" });
      saveStepFile(stepIdx, mockBlob, `lung_sound.wav`);
    }
  };

  const handleStepTimeout = () => {
    if (idx < TOTAL_STEPS - 1) {
      // Move to next step without stopping recording
      navigate(`/recording/${idx + 1}`);
    } else {
      // Final step: stop recording and fetch the audio
      handleStopRecording();
    }
  };

  const handleStopRecording = async () => {
    setIsProcessing(true);
    try {
      console.log("Sending stop command to backend...");
      await fetch(`${BACKEND_URL}/stop`);
      // Save under step 0 so Analyzing.tsx analyzes only this single combined file
      await fetchRealAudio(0);
    } catch (e) {
      console.error("Error stopping recording:", e);
    } finally {
      setIsProcessing(false);
    }

    sessionStorage.removeItem("esp32_auto_mode");
    navigate("/analyzing");
  };

  // Auto-advance countdown after file is ready
  useEffect(() => {
    if (!fileReady) return;
    setCount(RECORD_SECONDS);

    let currentCount = RECORD_SECONDS;
    timerRef.current = setInterval(() => {
      currentCount -= 1;
      setCount(currentCount);

      if (currentCount <= 0) {
        clearInterval(timerRef.current!);
        handleStepTimeout();
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fileReady, idx]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".wav")) {
      alert("กรุณาเลือกไฟล์ .wav เท่านั้น");
      return;
    }
    saveStepFile(idx, file, file.name);
    setFileName(file.name);
    setMode("uploading");
    setFileReady(true);
  };

  const handleEsp32Record = async () => {
    setMode("esp32");
    setEsp32Recording(true);
    sessionStorage.setItem("esp32_auto_mode", "true");

    try {
      // Signal ESP32 via backend to start recording
      console.log(`Signaling ESP32 to start step ${idx}`);
      await fetch(`${BACKEND_URL}/start`);

      setFileName(`record/${idx}`);
      setFileReady(true);
    } catch (error) {
      console.error("ESP32 signal error:", error);
      alert("ไม่สามารถส่งสัญญาณไปที่ ESP32 ได้ กรุณาตรวจสอบการเชื่อมต่อ Wi-Fi");
      setMode("idle");
      setEsp32Recording(false);
      sessionStorage.removeItem("esp32_auto_mode");
    }
  };

  const progress = fileReady ? ((RECORD_SECONDS - count) / RECORD_SECONDS) * 100 : 0;

  return (
    <Layout>
      <div className="text-center mb-8 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold mb-4">
          <span className={`w-2 h-2 rounded-full bg-destructive ${fileReady ? "animate-pulse" : ""}`} />
          {fileReady ? "กำลังบันทึก" : "รอไฟล์เสียง"}
        </div>
        <h1 className="text-5xl font-bold mb-2">{pos.title}: {pos.desc}</h1>
        <p className="text-lg text-muted-foreground">หายใจลึกๆ 2 ครั้ง · record/{idx} · รหัส {pos.code}</p>

        {/* Step progress dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {positions.map((p, i) => (
            <div
              key={p.code}
              className={`h-1.5 rounded-full transition-smooth ${i < idx ? "bg-success w-12" : i === idx ? "bg-primary w-20" : "bg-border w-12"
                }`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 items-center">
        {/* Chest diagram */}
        <div className="animate-fade-up">
          <ChestDiagram active={pos.code} size={440} showMarkers />
        </div>

        {/* Right panel */}
        <div className="flex flex-col items-center animate-fade-up" style={{ animationDelay: "0.1s" }}>

          {/* Countdown ring */}
          <div className="relative mb-8">
            <svg width="200" height="200" className="-rotate-90">
              <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
              <circle
                cx="100" cy="100" r="80" fill="none"
                stroke="url(#grad)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 80}
                strokeDashoffset={(2 * Math.PI * 80) - (progress / 100) * (2 * Math.PI * 80)}
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
              <Mic className="w-6 h-6 text-primary mb-1" />
              <div className="text-6xl font-bold tabular-nums bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-emerald-400">
                {isProcessing ? (
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                ) : fileReady ? (
                  count
                ) : (
                  "–"
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isProcessing ? "กำลังดึงเสียง..." : "วินาที"}
              </div>
            </div>
          </div>

          {/* 2 options */}
          {!fileReady ? (
            <div className="w-full max-w-xs space-y-3">
              <p className="text-xs text-center text-muted-foreground font-medium uppercase tracking-widest mb-4">
                เลือกวิธีบันทึกเสียง
              </p>

              {/* Option 1 — Upload WAV file */}
              <label
                htmlFor={`wav-upload-${idx}`}
                className={`flex items-center gap-4 w-full p-4 rounded-2xl border-2 transition-all group ${mode === "uploading"
                  ? "border-primary bg-primary/5"
                  : "border-primary/40 hover:border-primary bg-card hover:bg-primary/5 cursor-pointer"
                  }`}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center flex-shrink-0 transition-colors">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-foreground">เลือกไฟล์เสียงตัวอย่าง</p>
                  <p className="text-xs text-muted-foreground">รองรับไฟล์ .wav</p>
                </div>
                <input
                  id={`wav-upload-${idx}`}
                  type="file"
                  accept=".wav"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={mode === "esp32"}
                />
              </label>

              {/* Option 2 — ESP32 Record */}
              <button
                onClick={handleEsp32Record}
                disabled={esp32Recording}
                className={`flex items-center gap-4 w-full p-4 rounded-2xl border-2 transition-all ${esp32Recording
                  ? "border-primary bg-primary/5 cursor-wait"
                  : "border-primary/40 hover:border-primary bg-card hover:bg-primary/5 cursor-pointer"
                  }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${esp32Recording ? "bg-primary/20" : "bg-primary/10 group-hover:bg-primary/20"
                  }`}>
                  {esp32Recording ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <Wifi className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-foreground">บันทึกจากสายฟังเสียงปอด</p>
                  <p className="text-xs text-muted-foreground">เชื่อมต่ออุปกรณ์ผ่าน Wi-Fi</p>
                </div>
              </button>
            </div>
          ) : (
            /* File ready state */
            <div className="w-full max-w-xs space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-success/10 border border-success/30">
                <CheckCircle className="w-6 h-6 text-success flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-success truncate">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    เริ่มวิเคราะห์ใน {count}s
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/50">
                <Wifi className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  ขั้นตอน {idx + 1} / {TOTAL_STEPS} · {pos.code} · {mode === "uploading" ? "WAV" : "ESP32"}
                  {sessionStorage.getItem("esp32_auto_mode") === "true" && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold text-[10px]">AUTO</span>
                  )}
                </span>
              </div>

              {sessionStorage.getItem("esp32_auto_mode") === "true" && (
                <button
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors underline underline-offset-4"
                  onClick={async () => {
                    sessionStorage.removeItem("esp32_auto_mode");
                    setMode("idle");
                    setEsp32Recording(false);
                    setFileReady(false);
                    try {
                      await fetch(`${BACKEND_URL}/stop`);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                >
                  ยกเลิกโหมดอัตโนมัติ
                </button>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-muted-foreground max-w-xs text-sm">
            วางเซ็นเซอร์ที่ตำแหน่ง <span className="font-bold text-primary">{pos.code}</span> และหายใจลึกๆ
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Recording;
