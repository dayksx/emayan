import type { Grievance } from "@/lib/seedGrievances";
import LedgerEntry from "@/components/ledger/LedgerEntry";

const FeedItem = ({ grievance, index }: { grievance: Grievance; index?: number }) => {
  return (
    <li className="animate-fade-in-down list-none">
      <LedgerEntry grievance={grievance} index={index} />
    </li>
  );
};

export default FeedItem;
