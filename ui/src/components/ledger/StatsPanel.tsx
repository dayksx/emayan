const StatsPanel = () => {
  return (
    <div
      className="absolute top-20 left-6 z-30 rounded-sm"
      style={{
        background: "rgba(15,14,12,0.7)",
        border: "1px solid rgba(245,243,238,0.08)",
        padding: "1rem 1.25rem",
        backdropFilter: "blur(4px)",
        maxWidth: "320px",
      }}
    >
      <div className="grid grid-cols-2 gap-6 mb-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: "#888880" }}>
            Grievances Filed
          </p>
          <p className="font-mono text-[28px] leading-none" style={{ color: "#F5F3EE" }}>
            247
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: "#888880" }}>
            Donated to Date
          </p>
          <p className="font-mono text-[28px] leading-none" style={{ color: "#F5F3EE" }}>
            €189
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: "#888880" }}>
            Top Cause
          </p>
          <p className="font-mono text-[12px]" style={{ color: "#4A7AB5" }}>
            The Flat Earth Society
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: "#888880" }}>
            Pending Corrections
          </p>
          <p className="font-mono text-[12px]" style={{ color: "#F5F3EE" }}>
            12
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
