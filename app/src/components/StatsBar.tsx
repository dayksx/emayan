const stats = [
  "Grievances filed: 2,847",
  "Donated: 4,291.50 RLUSD",
  "Top recipient of petty donations: Flat Earth Society",
  "Avg. pettiness level: Considerable",
  "Repeat offenders: 412",
  "Pending corrections: 38",
  "Longest-held grudge: 14 years",
];

const StatsBar = () => (
  <div className="w-full border-y border-border overflow-hidden">
    <div className="flex animate-ticker">
      {[...stats, ...stats].map((stat, i) => (
        <div key={i} className="flex items-center gap-4 flex-shrink-0 px-4 py-3">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot flex-shrink-0" />
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            {stat}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default StatsBar;
