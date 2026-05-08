import { useNavigate, useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Smile, Meh, Frown, AlertOctagon, RotateCcw, Home } from "lucide-react";

type ResultType = "good" | "warning" | "bad" | "error";

const config: Record<ResultType, {
  label: string;
  Icon: typeof Smile;
  color: string;
  bg: string;
  message: string;
}> = {
  good: {
    label: "Good",
    Icon: Smile,
    color: "hsl(var(--success))",
    bg: "bg-success/10",
    message: "เสียงปอดคุณปกติ ไม่มีความเสี่ยงโรคปอด",
  },
  warning: {
    label: "Warning",
    Icon: Meh,
    color: "hsl(var(--warning))",
    bg: "bg-warning/10",
    message: "เสียงปอดของคุณมีแนวโน้มผิดปกติเล็กน้อย แนะนำให้พบแพทย์เพื่อตรวจเพิ่มเติม",
  },
  bad: {
    label: "Bad",
    Icon: Frown,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "เสียงปอดของคุณผิดปกติ โปรดพบแพทย์โดยด่วนเพื่อรับการวินิจฉัย",
  },
  error: {
    label: "Error",
    Icon: AlertOctagon,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    message: "โปรดลองใหม่อีกครั้ง ระบบไม่สามารถวิเคราะห์เสียงได้",
  },
};

const Result = () => {
  const { type = "good" } = useParams();
  const navigate = useNavigate();
  const r = (config[type as ResultType] || config.good);
  const { Icon } = r;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-fade-up">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">ผลการวิเคราะห์</div>
          <h1 className="text-5xl font-bold">สรุปผลตรวจเสียงปอด</h1>
        </div>

        <div className="bg-card rounded-3xl p-12 shadow-elegant border border-border/50 text-center">
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

          <p className="text-2xl text-foreground leading-relaxed max-w-xl mx-auto mb-8">
            {r.message}
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

        <div className="mt-10 text-center">
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
