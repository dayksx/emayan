import { useEffect, useRef, useState } from "react";
import { seedGrievances, type Grievance } from "@/lib/seedGrievances";
import LedgerEntry from "@/components/ledger/LedgerEntry";

declare global {
  interface Window {
    __activeLedgerIndex?: number;
  }
}

const LedgerFeedItem = ({ grievance, index }: { grievance: Grievance; index: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isClear, setIsClear] = useState(index === 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry.intersectionRatio;
        if (ratio > 0.6) {
          setIsClear(true);
          window.__activeLedgerIndex = index;
          window.dispatchEvent(new CustomEvent("ledger-active", { detail: index }));
        } else if (index !== 0) {
          setIsClear(false);
        }
      },
      { threshold: [0, 0.1, 0.3, 0.6, 0.9] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      className="border-b border-border/25 py-6 transition-all duration-700 ease-out sm:py-8"
      style={{
        opacity: isClear ? 1 : 0.35,
        filter: isClear ? "blur(0px)" : "blur(2px)",
        transform: isClear ? "translateY(0)" : "translateY(4px)",
      }}
    >
      <LedgerEntry grievance={grievance} index={index} className="bg-transparent" />
    </div>
  );
};

const LedgerFeed = () => {
  return (
    <div className="relative z-10 max-w-2xl mx-auto px-6 sm:px-8 py-16">
      <div
        className="flex items-center justify-between mb-12 pb-4"
        style={{ borderBottom: "1px solid rgba(245,243,238,0.08)" }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-widest"
          style={{ color: "#888880" }}
        >
          The Ledger
        </span>
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#4A7AB5" }}
          />
          <span
            className="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: "#4A7AB5" }}
          >
            Live
          </span>
        </div>
      </div>

      <div>
        {seedGrievances.map((g, i) => (
          <LedgerFeedItem key={g.id} grievance={g} index={i} />
        ))}
      </div>
    </div>
  );
};

export default LedgerFeed;
