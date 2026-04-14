import { seedGrievances } from "@/lib/seedGrievances";
import FeedItem from "./FeedItem";

type LiveFeedProps = {
  limit?: number;
  /** Hide title blurb (e.g. duplicate block inside a looping ticker) */
  hideHeader?: boolean;
};

const LiveFeed = ({ limit, hideHeader }: LiveFeedProps) => {
  const items = limit ? seedGrievances.slice(0, limit) : seedGrievances;

  return (
    <div>
      {!hideHeader && (
        <header className="mb-5 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 shrink-0 animate-pulse-dot rounded-full bg-primary" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Live Ledger
            </h2>
          </div>
          <p className="mt-1.5 font-body text-[11px] leading-snug text-muted-extra">
            Fresh filings from the petty docket. (Demo copy — your beef goes above.)
          </p>
        </header>
      )}
      <ul className="flex flex-col gap-4">
        {items.map((g, i) => (
          <FeedItem key={g.id} grievance={g} index={i} />
        ))}
      </ul>
    </div>
  );
};

export default LiveFeed;
