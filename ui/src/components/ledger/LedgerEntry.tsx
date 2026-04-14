import type { Grievance } from "@/lib/seedGrievances";
import { cn } from "@/lib/utils";

function docketNumber(index: number | undefined, id: number): string {
  return String(247 + (index ?? id)).padStart(5, "0");
}

/** One-liners under “Symbolic restitution” — rotate by id for variety */
const RESTITUTION_QUIPS: string[] = [
  "Receipt on file. Bragging rights included.",
  "Technically charitable. Emotionally nuclear.",
  "The ledger remembers. They might not.",
  "Justice, scaled to the offense. Micro-justice.",
  "Filed under: consequences (light roast).",
];

function restitutionQuip(seed: number): string {
  return RESTITUTION_QUIPS[Math.abs(seed) % RESTITUTION_QUIPS.length]!;
}

function statusClasses(status: Grievance["status"]): string {
  if (!status) return "";
  if (status === "PENDING") return "text-primary";
  if (status === "RESOLVED") return "text-muted-foreground";
  return "text-foreground";
}

export type LedgerEntryProps = {
  grievance: Grievance;
  index?: number;
  className?: string;
};

/**
 * Single ledger row: docket, charge, symbolic routing, compact facts.
 */
export default function LedgerEntry({ grievance, index, className }: LedgerEntryProps) {
  const no = docketNumber(index, grievance.id);
  const quip = restitutionQuip(grievance.id);
  const associationName = grievance.association ?? grievance.cause;

  return (
    <article
      className={cn(
        "rounded-sm border border-blue-border/30 bg-card/40 py-4 pl-3 pr-3 sm:pl-4 sm:pr-4 border-l-[3px] border-l-primary/35",
        className
      )}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-border/50 pb-2.5">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-widest text-muted-extra">Docket</p>
          <p className="font-mono text-sm tabular-nums text-primary">PL-{no}</p>
        </div>
        <p className="text-right font-mono text-[10px] uppercase tracking-wider text-muted-extra">
          Filed
          <span className="mt-0.5 block font-mono text-[11px] normal-case tracking-normal text-muted-foreground">
            {grievance.time}
          </span>
        </p>
      </header>

      <section className="mb-3" aria-label="Charge">
        <h2 className="mb-1.5 font-mono text-[8px] uppercase tracking-widest text-muted-extra">
          Alleged offense
        </h2>
        <blockquote className="border-l-2 border-primary/30 pl-3 font-body text-[13px] leading-[1.65] text-foreground">
          &ldquo;{grievance.text}&rdquo;
        </blockquote>
      </section>

      <section
        className="mb-3 rounded-sm border border-blue-border/20 bg-secondary/40 px-2.5 py-2"
        aria-label="Symbolic restitution"
      >
        <h2 className="mb-1 font-mono text-[8px] uppercase tracking-widest text-muted-extra">
          Symbolic restitution
        </h2>
        <p className="mb-1.5 font-mono text-[8px] uppercase tracking-widest text-muted-extra">
          Association
        </p>
        <p className="mb-2 font-body text-[12px] leading-snug text-foreground">{associationName}</p>
        <p className="font-body text-[12px] leading-snug text-foreground">
          <span className="font-mono text-[11px] text-muted-foreground">{grievance.amount}</span>
          {grievance.association != null && grievance.association !== grievance.cause ? (
            <>
              <span className="mx-1.5 text-muted-extra">→</span>
              <span>{grievance.cause}</span>
            </>
          ) : null}
        </p>
        <p className="mt-1.5 font-body text-[11px] italic leading-snug text-muted-extra">{quip}</p>
      </section>

      <footer
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border/40 pt-2.5 font-mono text-[10px] text-muted-foreground"
        aria-label="Entry metadata"
      >
        <span>
          <span className="mr-1 text-[8px] uppercase tracking-wider text-muted-extra">Levy</span>
          {grievance.amount}
        </span>
        <span className="text-muted-extra" aria-hidden>
          ·
        </span>
        <span>
          <span className="mr-1 text-[8px] uppercase tracking-wider text-muted-extra">When</span>
          {grievance.time}
        </span>
        {grievance.status && (
          <>
            <span className="text-muted-extra" aria-hidden>
              ·
            </span>
            <span>
              <span className="mr-1 text-[8px] uppercase tracking-wider text-muted-extra">
                Status
              </span>
              <span className={cn("uppercase tracking-wider", statusClasses(grievance.status))}>
                {grievance.status}
              </span>
            </span>
          </>
        )}
      </footer>
    </article>
  );
}
