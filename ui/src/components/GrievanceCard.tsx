import { useEffect, useState } from "react";

const GrievanceCard = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="relative w-full max-w-[480px] select-none"
      style={{ perspective: "1200px" }}
    >
      {/* Ambient glow behind card */}
      <div
        className="absolute -inset-8 rounded-3xl"
        style={{
          background: "radial-gradient(ellipse at 40% 40%, rgba(74,122,181,0.08) 0%, transparent 70%)",
          opacity: mounted ? 1 : 0,
          transition: "opacity 2s ease-out",
          pointerEvents: "none",
        }}
      />

      {/* Card with 3D effect */}
      <div
        className="relative"
        style={{
          transform: mounted
            ? "rotateY(-3deg) rotateX(2deg) rotate(-2deg)"
            : "rotateY(-8deg) rotateX(4deg) rotate(-6deg) translateY(40px)",
          opacity: mounted ? 1 : 0,
          transition: "all 1.2s cubic-bezier(0.23, 1, 0.32, 1)",
          transformStyle: "preserve-3d",
          boxShadow: mounted
            ? `
              12px 16px 40px rgba(0,0,0,0.5),
              4px 6px 12px rgba(0,0,0,0.3),
              -1px -1px 0 rgba(255,255,255,0.05) inset,
              0 0 80px rgba(0,0,0,0.2)
            `
            : "0 0 0 rgba(0,0,0,0)",
          borderRadius: "2px",
          animation: mounted ? "card-hover 6s ease-in-out infinite" : "none",
        }}
      >
        {/* Dog ear - dark background peek-through */}
        <div
          className="absolute top-0 right-0 z-20"
          style={{
            width: "36px",
            height: "36px",
            background: "linear-gradient(225deg, hsl(0 0% 6%) 0%, hsl(0 0% 6%) 50%, transparent 50%)",
          }}
        />
        {/* Dog ear - folded paper */}
        <div
          className="absolute top-0 right-0 z-20"
          style={{
            width: "36px",
            height: "36px",
            background: "linear-gradient(225deg, transparent 50%, hsl(40 20% 88%) 50%, hsl(40 22% 90%) 100%)",
            boxShadow: "-2px 2px 4px rgba(0,0,0,0.15)",
            animation: mounted ? "corner-flutter 4s ease-in-out infinite 2s" : "none",
          }}
        />

        {/* Paper texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10 rounded-sm"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, rgba(0,0,0,0.03) 100%)",
          }}
        />

        {/* eslint-disable-next-line @next/next/no-img-element -- public decorative asset */}
        <img
          src="/grievance-notice.png"
          alt="Example grievance notice"
          className="block h-auto w-full rounded-sm"
        />
      </div>
    </div>
  );
};

export default GrievanceCard;
