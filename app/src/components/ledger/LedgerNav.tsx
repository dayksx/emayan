import Link from "next/link";

const LedgerNav = () => (
  <nav
    className="sticky top-0 z-40 flex items-center justify-between px-6"
    style={{
      height: "56px",
      background: "#0F0E0C",
      borderBottom: "1px solid rgba(245,243,238,0.08)",
    }}
  >
    <Link href="/" className="font-serif text-base font-extralight tracking-tight" style={{ color: "#F5F3EE" }}>
      Petty Ledger
    </Link>
    <div className="flex items-center gap-4">
      <Link
        href="/"
        className="font-mono text-[10px] uppercase tracking-wider transition-colors"
        style={{ color: "#888880" }}
      >
        ← Back
      </Link>
      <Link href="/#file" className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "#4A7AB5" }}>
        File a grievance →
      </Link>
    </div>
  </nav>
);

export default LedgerNav;
