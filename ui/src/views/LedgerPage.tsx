"use client";

import Link from "next/link";
import TopRule from "@/components/TopRule";
import Nav from "@/components/Nav";
import StatsBar from "@/components/StatsBar";
import LedgerFooter from "@/components/ledger/LedgerFooter";
import { SentTransactionsPanel } from "../../components/SentTransactionsPanel";

export default function LedgerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopRule />
      <Nav />
      <StatsBar />

      <main className="relative flex-1">
        <div className="relative z-10 mx-auto max-w-2xl px-6 py-10 sm:px-8 sm:py-14">
          <header className="mb-8 text-center sm:text-left">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-extra">Petty Ledger</p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">The Ledger</h1>
            <p className="mx-auto mt-2 max-w-lg font-body text-sm leading-relaxed text-muted-foreground sm:mx-0">
              Outbound memos and resolutions on XRPL testnet—same petty energy as the registry, in
              bookkeeping cosplay.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex font-mono text-[10px] uppercase tracking-wider text-primary underline-offset-4 hover:underline"
            >
              ← Back to filing desk
            </Link>
          </header>

          <div className="relative rounded-2xl bg-muted/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:bg-muted/15">
            <div className="relative px-4 py-6 sm:px-6 sm:py-8">
              <SentTransactionsPanel variant="ledger" />
            </div>
          </div>
        </div>
      </main>

      <LedgerFooter />
    </div>
  );
}
