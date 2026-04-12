"use client";

import { useState } from "react";
import TopRule from "@/components/TopRule";
import Nav from "@/components/Nav";
import StatsBar from "@/components/StatsBar";
import Hero from "@/components/Hero";
import LiveFeed from "@/components/LiveFeed";
import EmayanPettyGrievanceForm from "@/components/EmayanPettyGrievanceForm";
import { SentTransactionsPanel } from "../../components/SentTransactionsPanel";

export default function Index() {
  const [txListRefresh, setTxListRefresh] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <TopRule />
      <Nav />
      <StatsBar />
      <Hero />
      <div className="border-t border-border" />
      <div className="relative py-12">
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-1/3 top-0 overflow-hidden"
          style={{
            filter: "blur(3px)",
            opacity: 0.12,
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
          }}
        >
          <div className="animate-ticker-vertical px-6">
            <LiveFeed />
            <LiveFeed />
          </div>
        </div>
        <div className="relative z-10 mx-auto max-w-2xl px-6">
          <div className="rounded-sm border border-blue-border bg-card/95 p-6 shadow-sm backdrop-blur-sm md:p-8">
            <EmayanPettyGrievanceForm onSubmitted={() => setTxListRefresh((n) => n + 1)} />
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-12 max-w-wide px-6 pb-16">
          <SentTransactionsPanel refreshKey={txListRefresh} />
        </div>
      </div>
    </div>
  );
}
