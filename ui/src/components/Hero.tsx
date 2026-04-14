import Link from "next/link";
import { Pen, Send } from "lucide-react";
import GrievanceCard from "./GrievanceCard";

const Hero = () => (
  <section className="w-full py-16 md:py-24">
    <div className="mx-auto max-w-wide px-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12 xl:gap-16">
        <div className="min-w-0 flex-1">
          <p className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Public Grievance Registry
          </p>
          <h1 className="mb-0 leading-tight">
            <span className="block font-serif text-2xl font-light text-foreground md:text-3xl lg:text-[2.25rem]">
              A petty person never forgets.
            </span>
            <span className="mt-1 block font-serif text-2xl font-light text-primary md:text-3xl lg:text-[2.25rem]">
              Neither does the blockchain.
            </span>
          </h1>

          <div className="mt-14 max-w-md space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm border border-primary/30">
                <Pen className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-body text-base text-muted-foreground">File grievances against your friends.</p>
                <p className="mt-1 font-body text-sm text-muted-foreground">Notify them via Telegram.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm border border-primary/30">
                <Send className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-body text-base text-muted-foreground">Set a pending donation to a cause they hate.</p>
                <p className="mt-1 font-body text-sm text-muted-foreground">Unless they correct the grievance in time.</p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <a
              href="#file"
              className="inline-flex items-center rounded-sm bg-primary px-6 py-3 font-mono text-xs uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90"
            >
              File a grievance →
            </a>
            <Link
              href="/ledger"
              className="inline-flex items-center px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              View the Ledger →
            </Link>
          </div>
        </div>

        <div className="hidden flex-shrink-0 items-start justify-center pt-4 lg:flex lg:w-[480px]">
          <GrievanceCard />
        </div>
      </div>
    </div>
  </section>
);

export default Hero;
