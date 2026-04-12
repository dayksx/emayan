import { seedGrievances } from "@/lib/seedGrievances";
import FeedItem from "./FeedItem";

const LiveFeed = ({ limit }: { limit?: number }) => {
  const items = limit ? seedGrievances.slice(0, limit) : seedGrievances;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Live Ledger
        </span>
      </div>
      <div>
        {items.map((g, i) => (
          <FeedItem key={g.id} grievance={g} index={i} />
        ))}
      </div>
    </div>
  );
};

export default LiveFeed;
