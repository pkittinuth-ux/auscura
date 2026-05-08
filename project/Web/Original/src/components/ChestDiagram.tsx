import chest from "@/assets/chest-clean.jpg";

type Pos = "RUL" | "LUL" | "RML" | "LLL";

// Coordinates as % of container — match the numbered markers baked into chest-clean.jpg
// Image is mirrored (patient's right = viewer's left)
const POSITIONS: Record<Pos, { top: string; left: string }> = {
  RUL: { top: "44%", left: "36%" }, // 1 - viewer left
  LUL: { top: "44%", left: "65%" }, // 2 - viewer right
  RML: { top: "67%", left: "65%" }, // 3 - viewer right
  LLL: { top: "67%", left: "36%" }, // 4 - viewer left
};

interface Props {
  active?: Pos | null;
  size?: number;
  showMarkers?: boolean;
}

const ChestDiagram = ({ active = null, size = 460, showMarkers = false }: Props) => {
  // Reference image aspect ratio is portrait (~3:4)
  const height = Math.round(size * 1.33);
  return (
    <div
      className="relative mx-auto rounded-3xl overflow-hidden shadow-elegant border border-border/50 bg-card"
      style={{ width: size, height }}
    >
      <img
        src={chest}
        alt="Front view of human torso showing 4 stethoscope positions: RUL, LUL, RML, LLL"
        className="absolute inset-0 w-full h-full object-contain bg-white"
        loading="lazy"
        width={1080}
        height={1440}
      />

      {/* Optional active highlight ring on top of the baked-in marker */}
      {showMarkers && active && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 transition-smooth pointer-events-none"
          style={{ top: POSITIONS[active].top, left: POSITIONS[active].left }}
        >
          <div
            className="rounded-full pulse-ring border-4 border-primary/70"
            style={{ width: 78, height: 78 }}
          />
        </div>
      )}
    </div>
  );
};

export default ChestDiagram;
