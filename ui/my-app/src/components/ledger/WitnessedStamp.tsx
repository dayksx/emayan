import { useEffect, useState } from "react";

const WitnessedStamp = () => {
  const [phase, setPhase] = useState<"hidden" | "slam" | "hold" | "fade" | "gone">("hidden");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("slam"), 300);
    const t2 = setTimeout(() => setPhase("hold"), 600);
    const t3 = setTimeout(() => setPhase("fade"), 2100);
    const t4 = setTimeout(() => setPhase("gone"), 3100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  if (phase === "hidden" || phase === "gone") return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{
        opacity: phase === "slam" ? 1 : phase === "hold" ? 0.85 : 0,
        transition: phase === "fade" ? "opacity 1s ease-out" : "opacity 0.1s ease-out",
      }}
    >
      <div
        style={{
          transform: `rotate(-12deg) scale(${phase === "slam" ? 1.15 : 1})`,
          transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <svg width="280" height="280" viewBox="0 0 280 280">
          {/* Rough circle */}
          <ellipse
            cx="140"
            cy="140"
            rx="125"
            ry="120"
            fill="none"
            stroke="rgba(192, 57, 43, 0.7)"
            strokeWidth="6"
            strokeDasharray="8 3"
            style={{ filter: "url(#rough)" }}
          />
          <ellipse
            cx="140"
            cy="140"
            rx="105"
            ry="100"
            fill="none"
            stroke="rgba(192, 57, 43, 0.5)"
            strokeWidth="2"
          />
          <text
            x="140"
            y="148"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(192, 57, 43, 0.7)"
            fontFamily="'DM Mono', monospace"
            fontSize="28"
            fontWeight="500"
            letterSpacing="8"
          >
            WITNESSED
          </text>
          <defs>
            <filter id="rough">
              <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default WitnessedStamp;
