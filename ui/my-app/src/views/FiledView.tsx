"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import TopRule from "@/components/TopRule";
import Nav from "@/components/Nav";
import StatsBar from "@/components/StatsBar";
import { txExplorerUrl } from "../../lib/xrpl-explorer";

type FiledPayload = {
  filingType?: number;
  accused?: string;
  accusedTelegram?: string;
  grievance?: string;
  caseNumber?: string;
  txHash?: string;
  telegramStatus?: string;
};

const titles: Record<number, (accused: string) => string> = {
  1: () => "Your grievance has been entered into the permanent record.",
  2: (a) => `${a} has been notified. The record stands.`,
  3: (a) => `Done. ${a} has been notified. The donation has been made.`,
  4: (a) => `Filed. ${a} has been warned. The escrow is locked.`,
};

export default function FiledView() {
  const searchParams = useSearchParams();
  const txFromUrl = searchParams?.get("tx") ?? "";

  const [data, setData] = useState<FiledPayload | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("emayanFiled");
      if (raw) setData(JSON.parse(raw) as FiledPayload);
    } catch {
      setData(null);
    }
  }, []);

  const filingType = data?.filingType ?? 1;
  const accused = data?.accused ?? "The accused";
  const accusedTelegram = data?.accusedTelegram ?? "";
  const caseNumber = data?.caseNumber ?? "00000";
  const grievance = data?.grievance;
  const txHash = (txFromUrl || data?.txHash || "").trim();
  const telegramStatus = data?.telegramStatus;

  const now = new Date();
  const timestamp = now.toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const canLinkExplorer = Boolean(txHash && txHash !== "Pending");

  return (
    <div className="min-h-screen bg-background">
      <TopRule />
      <Nav />
      <StatsBar />
      <div className="relative mx-auto max-w-content px-6 py-16 text-center">
        <div className="relative z-10">
          <div className="relative mb-2">
            <p className="text-center font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Official Record · Do Not Destroy
            </p>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 animate-stamp">
              <svg width="52" height="52" viewBox="0 0 52 52" className="opacity-[0.22]">
                <circle
                  cx="26"
                  cy="26"
                  r="24"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1.5"
                  strokeDasharray="2.5 0.8 4 1.2 3 0.5"
                />
                <circle
                  cx="26"
                  cy="26"
                  r="20"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="0.8"
                  strokeDasharray="1.5 1 3 0.8 2 1.5"
                />
                <text
                  x="26"
                  y="24"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-mono"
                  fontSize="7"
                  fontWeight="700"
                  letterSpacing="2"
                  fill="hsl(var(--primary))"
                  transform="rotate(-6, 26, 26)"
                >
                  FILED
                </text>
                <text
                  x="26"
                  y="32"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-mono"
                  fontSize="3"
                  letterSpacing="1.5"
                  fill="hsl(var(--primary))"
                  transform="rotate(-6, 26, 26)"
                >
                  OFFICIAL
                </text>
                <circle cx="12" cy="26" r="0.8" fill="hsl(var(--primary))" />
                <circle cx="40" cy="26" r="0.8" fill="hsl(var(--primary))" />
              </svg>
            </div>
          </div>
          <p className="mb-6 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Case No. #{caseNumber} · {timestamp}
          </p>

          <h1 className="mx-auto mb-8 max-w-lg font-serif text-2xl leading-snug text-foreground md:text-3xl">
            {(titles[filingType] ?? titles[1])!(accused)}
          </h1>

          {grievance && (
            <div className="mx-auto mb-8 max-w-md overflow-hidden rounded-sm border border-primary/20">
              <div className="px-6 pb-1 pt-4">
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  {accusedTelegram
                    ? `The below was sent to ${accusedTelegram}`
                    : "Filed to the public ledger"}
                </p>
              </div>
              <div className="px-6 py-5">
                <p className="font-serif text-sm leading-relaxed text-foreground">{grievance}</p>
              </div>
              <div className="px-6 pb-3">
                <p className="text-right font-mono text-[8px] uppercase tracking-widest text-muted-extra">
                  Case #{caseNumber}
                </p>
              </div>
            </div>
          )}

          <div className="mx-auto mb-10 max-w-md border border-primary/20 bg-card/60 px-8 py-8 text-center">
            <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Ledger transaction
            </p>
            {txHash ? (
              <>
                <p className="mb-5 font-mono text-[10px] uppercase tracking-wide text-muted-extra">
                  XRPL testnet · payment with memo
                </p>
                <div className="mb-6 rounded-sm border border-border/80 bg-secondary/30 px-4 py-3">
                  <p className="break-all font-mono text-[11px] leading-relaxed text-foreground">
                    {txHash}
                  </p>
                </div>
                {canLinkExplorer ? (
                  <a
                    href={txExplorerUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-mono text-[10px] uppercase tracking-widest text-primary underline decoration-primary/30 underline-offset-[5px] transition-colors hover:text-foreground hover:decoration-foreground/40"
                  >
                    View on testnet explorer →
                  </a>
                ) : (
                  <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                    Final hash pending — refresh when your wallet confirms.
                  </p>
                )}
                {telegramStatus && (
                  <p className="mt-6 border-t border-border/50 pt-5 font-mono text-[9px] uppercase tracking-wider text-muted-extra">
                    Telegram{" "}
                    {telegramStatus === "sent" && "notified"}
                    {telegramStatus === "not_configured" && "not configured (memo on-chain)"}
                    {telegramStatus === "skipped" && "skipped"}
                    {telegramStatus === "failed" && "notify failed"}
                  </p>
                )}
              </>
            ) : (
              <p className="font-body text-sm leading-relaxed text-muted-foreground">
                No transaction id in this session. Open this page from the filing flow or keep the{" "}
                <code className="font-mono text-[11px] text-foreground/80">?tx=</code> link from your wallet.
              </p>
            )}
          </div>

          {filingType === 4 && (
            <p className="mx-auto mb-8 max-w-sm font-mono text-[9px] text-primary">
              A cancellation link has been sent to your Telegram. Tap it if the matter is corrected before the deadline.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="rounded-sm bg-primary px-6 py-3 font-body text-sm text-primary-foreground transition-opacity hover:opacity-90"
            >
              File another grievance →
            </Link>
            <Link
              href="/ledger"
              className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              View the ledger
            </Link>
          </div>

          <p className="mt-12 font-mono text-[9px] text-muted-extra">
            This document is now part of the permanent record. Yours in documentation.
          </p>
        </div>
      </div>
    </div>
  );
}
