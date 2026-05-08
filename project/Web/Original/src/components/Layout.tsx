import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import waveBg from "@/assets/wave-bg.png";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const isActive = (p: string) => pathname === p;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Decorative wave background */}
      <div
        className="absolute top-0 left-0 right-0 h-[420px] opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url(${waveBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
        }}
      />

      <header className="relative w-full z-50">
        <div className="mx-auto flex h-24 items-center justify-between px-12" style={{ maxWidth: 1440 }}>
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Auscura logo" className="h-14 w-auto" height={56} />
          </Link>
          <nav className="flex items-center gap-2 bg-card/80 backdrop-blur-md rounded-full p-1.5 shadow-soft border border-border/50">
            <Link
              to="/"
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-smooth ${isActive("/") ? "gradient-hero text-primary-foreground shadow-soft" : "text-foreground hover:bg-accent"
                }`}
            >
              หน้าหลัก
            </Link>
            <Link
              to="/sounds"
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-smooth ${isActive("/sounds") ? "gradient-hero text-primary-foreground shadow-soft" : "text-foreground hover:bg-accent"
                }`}
            >
              ตัวอย่างเสียง
            </Link>
          </nav>
        </div>
      </header>
      <main className="relative mx-auto px-12 py-8" style={{ maxWidth: 1440 }}>
        {children}
      </main>
      <footer className="relative border-t border-border/50 mt-16 bg-gradient-to-b from-transparent to-secondary/40">
        <div className="mx-auto px-12 py-10 grid grid-cols-1 md:grid-cols-3 gap-8" style={{ maxWidth: 1440 }}>
          <div className="flex items-start gap-3">
            <img src={logo} alt="Auscura" className="h-12 w-auto" />
            <div>
              <div className="font-bold text-foreground text-lg">Auscura</div>
              <div className="text-sm text-muted-foreground mt-1">
                ระบบคัดกรองเสียงปอดด้วย AI
              </div>
            </div>
          </div>

          <div>
            <div className="font-semibold text-foreground mb-2">ผู้จัดทำโครงงาน</div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-medium text-primary">กิตติณัฒจ์ พงศ์เลิศนภากร</span>
              <br />
              โครงงานนักเรียนระดับมัธยมศึกษา
            </div>
          </div>

          <div>
            <div className="font-semibold text-foreground mb-2">⚠️ ข้อควรทราบ</div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              ระบบนี้พัฒนาขึ้น<span className="font-medium text-foreground">เพื่อการศึกษาและคัดกรองเบื้องต้น</span>เท่านั้น
              <br />
              <span className="text-destructive font-medium">ไม่ใช่การวินิจฉัยโรคจริง</span> โปรดปรึกษาแพทย์เพื่อการวินิจฉัยที่ถูกต้อง
            </div>
          </div>
        </div>
        <div className="border-t border-border/40">
          <div className="mx-auto px-12 py-4 text-center text-xs text-muted-foreground" style={{ maxWidth: 1440 }}>
            © 2026 Auscura · All rights reserved
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
