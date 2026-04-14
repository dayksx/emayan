"use client";

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

      <main className="relative z-10 flex-1">
        <div className="relative z-10 mx-auto max-w-2xl px-6 py-10 sm:px-8 sm:py-16">
          <SentTransactionsPanel />
        </div>
      </main>

      <LedgerFooter />
    </div>
  );
}
