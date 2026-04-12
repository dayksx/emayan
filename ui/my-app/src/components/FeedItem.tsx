import type { Grievance } from "@/lib/seedGrievances";

const FeedItem = ({ grievance, index }: { grievance: Grievance; index?: number }) => {
  const caseNo = String(247 + (index ?? grievance.id)).padStart(5, "0");

  return (
    <div className="py-5 border-b border-border animate-fade-in-down pl-4 border-l-2 border-l-primary/20">
      <p className="font-mono text-[8px] uppercase tracking-widest text-muted-extra mb-2">
        Case No. {caseNo}
      </p>
      <p className="font-body text-[13px] leading-[1.65] text-foreground mb-2">
        &ldquo;{grievance.text}&rdquo;
      </p>
      <p className="font-mono text-[11px] text-muted-foreground mb-3">
        → {grievance.amount} donated to {grievance.cause} in their honor
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[9px] uppercase tracking-wider text-primary border border-blue-border px-2 py-0.5 rounded-sm">
          {grievance.cause}
        </span>
        <span className="text-muted-extra text-[9px]">·</span>
        <span className="font-mono text-[9px] text-muted-foreground">{grievance.amount}</span>
        <span className="text-muted-extra text-[9px]">·</span>
        <span className="font-mono text-[9px] text-muted-foreground">{grievance.time}</span>
        {grievance.status && (
          <>
            <span className="text-muted-extra text-[9px]">·</span>
            <span className={`font-mono text-[9px] uppercase tracking-wider ${
              grievance.status === "PENDING" ? "text-primary" :
              grievance.status === "RESOLVED" ? "text-muted-foreground" :
              "text-foreground"
            }`}>
              {grievance.status}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedItem;
