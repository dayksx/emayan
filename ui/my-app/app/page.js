"use client";

import { Header } from "../components/Header";
import { AccountInfo } from "../components/AccountInfo";
import { TransactionForm } from "../components/TransactionForm";
import { Badge } from "../components/ui/badge";
import { Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        className="pointer-events-none fixed inset-0 bg-hero-glow"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-grid-pattern bg-[length:48px_48px] opacity-[0.45]"
        aria-hidden
      />

      <Header />

      <main className="relative flex-1">
        <div className="container py-10 md:py-14">
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
            <Badge
              variant="secondary"
              className="mb-4 border border-border/80 bg-secondary/80 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
            >
              <Sparkles className="mr-1.5 h-3 w-3 text-primary" aria-hidden />
              Developer starter
            </Badge>
            <h1 className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl md:text-5xl">
              Build on the XRP Ledger
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              Connect a wallet, inspect your account, and send test transactions — all
              from a clean, focused interface.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            <AccountInfo />
            <TransactionForm />
          </div>

          <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-xl border border-border/80 bg-card/40 p-6 shadow-lg shadow-black/10 backdrop-blur-sm md:p-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Getting started
            </h2>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  1
                </span>
                <span>Use Connect in the header to link Crossmark, Gem, Xaman, or WalletConnect.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  2
                </span>
                <span>Your address, network, and wallet name appear in the account card.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  3
                </span>
                <span>Send XRP (drops) from the transaction panel once connected.</span>
              </li>
            </ol>
          </div>
        </div>
      </main>

      <footer className="relative border-t border-border/60 bg-background/50 py-8 backdrop-blur-sm">
        <div className="container text-center text-xs text-muted-foreground">
          Scaffold-XRP · XRPL development toolkit
        </div>
      </footer>
    </div>
  );
}
