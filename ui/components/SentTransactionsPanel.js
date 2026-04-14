"use client";

import { useEffect, useState } from "react";
import {
  Client,
  convertHexToString,
  convertStringToHex,
  dropsToXrp,
  rippleTimeToISOTime,
} from "xrpl";
import { useWallet } from "./providers/WalletProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { txExplorerUrl, TESTNET_WSS } from "../lib/xrpl-explorer";
import {
  CORRECTION_WINDOW_POLICY_LABEL,
  buildGrievanceMemoText,
  buildGrievanceResolutionMemoText,
  getGrievanceResolutionEligibility,
  parsePettyLedgerGrievanceMemo,
  parsePettyLedgerResolutionMemo,
} from "../lib/grievance-memo";
import { ExternalLink, Inbox, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { REVENGE_DONATION_CAUSES } from "../src/lib/revenge-donation-causes";

function decodeMemos(memos) {
  if (!memos?.length) return [];
  return memos
    .map((entry) => {
      const m = entry.Memo;
      if (!m) return null;
      try {
        const data = m.MemoData ? convertHexToString(m.MemoData) : "";
        const type = m.MemoType ? convertHexToString(m.MemoType) : "";
        const format = m.MemoFormat ? convertHexToString(m.MemoFormat) : "";
        return { data, type, format };
      } catch {
        return { data: "(could not decode memo)", type: "", format: "" };
      }
    })
    .filter(Boolean);
}

function truncateMid(s, left = 6, right = 4) {
  if (!s || s.length <= left + right + 1) return s;
  return `${s.slice(0, left)}…${s.slice(-right)}`;
}

function formatCorrectionDeadline(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Split `Petty Ledger - RESOLVED - Cancels tx: …` for emphasis on the status prefix. */
function splitResolutionMemoHead(memoText) {
  if (!memoText || typeof memoText !== "string") return null;
  const sep = " - Cancels tx:";
  const idx = memoText.indexOf(sep);
  if (idx <= 0) return null;
  const head = memoText.slice(0, idx);
  if (head !== "Petty Ledger - RESOLVED") return null;
  return { head, tail: memoText.slice(idx) };
}

function ResolutionMemoBody({ memoText }) {
  const parts = splitResolutionMemoHead(memoText);
  if (!parts) {
    return (
      <p className="font-mono text-sm leading-relaxed text-foreground/95">{memoText || "(empty memo)"}</p>
    );
  }
  return (
    <p className="font-mono text-sm leading-relaxed text-foreground/95">
      <span
        className="mr-2 inline-flex max-w-full items-center rounded-md bg-emerald-500/15 px-2 py-1 align-middle font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100"
        translate="no"
      >
        {parts.head}
      </span>
      <span className="break-all text-foreground/90">{parts.tail}</span>
    </p>
  );
}

/**
 * Renders fields from parsePettyLedgerGrievanceMemo (Cause, Amount, From; no To).
 * Optional verbatim memo for auditors.
 */
function ParsedGrievanceMemo({ parsed, rawMemo, txHash, variant = "default" }) {
  const isLedger = variant === "ledger";
  return (
    <div
      className={cn(
        "rounded-lg px-4 py-4 sm:px-5 sm:py-5",
        isLedger
          ? "mb-0 rounded-xl bg-muted/30 px-3 py-3.5 sm:px-4 dark:bg-muted/25"
          : "mb-5 bg-muted/25"
      )}
    >
      <div className={cn(isLedger ? "mb-4" : "mb-5")}>
        <p className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.15em] text-muted-extra">Cause</p>
        <p className="font-serif text-[17px] font-normal leading-relaxed tracking-tight text-foreground sm:text-lg">
          {parsed.cause}
        </p>
      </div>
      {parsed.association ? (
        <div className={cn(isLedger ? "mb-4" : "mb-5")}>
          <p className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.15em] text-muted-extra">
            Association
          </p>
          <p className="font-body text-[15px] leading-snug text-foreground/95">{parsed.association}</p>
        </div>
      ) : null}
      <dl
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2",
          isLedger ? "gap-3 sm:gap-x-6 sm:gap-y-3" : "gap-5 sm:gap-x-8 sm:gap-y-4"
        )}
      >
        <div>
          <dt className="font-mono text-[8px] uppercase tracking-[0.15em] text-muted-extra">Amount</dt>
          <dd className="mt-1 font-mono text-sm tabular-nums tracking-tight text-foreground">
            {parsed.amountXrp} XRP
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-mono text-[8px] uppercase tracking-[0.15em] text-muted-extra">From</dt>
          <dd className="mt-1 break-all font-mono text-[11px] leading-relaxed text-foreground/95">
            {parsed.from}
          </dd>
        </div>
        {parsed.correctionUntilIso ? (
          <div className="sm:col-span-2">
            <dt className="font-mono text-[8px] uppercase tracking-[0.15em] text-muted-extra">
              Correction deadline
            </dt>
            <dd className="mt-1 font-mono text-xs text-foreground/95">
              <time dateTime={parsed.correctionUntilIso}>
                {formatCorrectionDeadline(parsed.correctionUntilIso)}
              </time>
            </dd>
          </div>
        ) : null}
        {txHash ? (
          <div className="sm:col-span-2">
            <dt className="font-mono text-[8px] uppercase tracking-[0.15em] text-muted-extra">
              On-chain transaction
            </dt>
            <dd className="mt-1.5">
              <a
                href={txExplorerUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] text-primary underline decoration-primary/30 underline-offset-4 hover:opacity-90"
              >
                View transaction
                <ExternalLink className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                <span className="text-muted-foreground no-underline">({truncateMid(txHash, 8, 6)})</span>
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
      {rawMemo ? (
        <details className={cn(isLedger ? "mt-4" : "mt-5")}>
          <summary className="cursor-pointer list-none font-mono text-[9px] uppercase tracking-wider text-muted-extra [&::-webkit-details-marker]:hidden hover:text-muted-foreground">
            Verbatim memo
          </summary>
          <pre className="mt-3 max-w-full whitespace-pre-wrap break-all rounded-md bg-background/50 py-2.5 pl-2 pr-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
            {rawMemo}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

/** 1 drop — minimum XRP amount for a memo-only follow-up tx. */
const ONE_DROP = "1";

/** Demo copy when wallet is empty or disconnected — not on-chain */
const EXAMPLE_GRIEVANCES = [
  "For reheating fish in the office microwave, then leaving the scene like a Bond villain with no license to grill.",
  "For saying “five minutes away” with the confidence of a weather app in a hurricane.",
  "For suggesting we split the bill evenly after ordering the lobster, two cocktails, and a personality.",
  "For replying “lol” to a voice note that clearly required emotional labor and possibly a small stipend.",
  "For leaving exactly one sheet of toilet paper on the roll and calling it “still basically full.”",
];

/** Petty Ledger escrow — matches filing form destination */
const PETTY_ESCROW = "r9ogmjMT1XHQivnX5UzqzxohBagKPDJHrP";
const FILL_FROM = "rPsBE82Gt6hmEoHc74tUMWwx4rPjwdjrhQ";
const FILL_AMOUNTS = ["0.5", "1", "2", "1", "0.5"];

function buildLedgerFillRows() {
  return EXAMPLE_GRIEVANCES.map((grievanceBody, i) => {
    const amountXrp = FILL_AMOUNTS[i] ?? "1";
    const associationLabel = REVENGE_DONATION_CAUSES[i]?.label;
    const memoText = buildGrievanceMemoText({
      filer: FILL_FROM,
      to: PETTY_ESCROW,
      amountXrp,
      grievanceBody,
      ...(associationLabel ? { associationLabel } : {}),
    });
    const grievanceParsed = parsePettyLedgerGrievanceMemo(memoText);
    const dateIso = new Date(Date.now() - (i + 1) * 130000).toISOString();
    return {
      hash: `fill-${i}`,
      destination: PETTY_ESCROW,
      amountXrp,
      dateIso,
      memoText,
      kind: grievanceParsed ? "grievance" : "other",
      grievanceParsed,
      resolutionParsed: null,
      resolvedBy: null,
      isSynthetic: true,
    };
  });
}

/** Hardcoded sample rows — appended at the end of the ledger register for every viewer (not on-chain). */
const LEDGER_FILL_ROWS = buildLedgerFillRows();

function ExampleGrievancesSection({ className }) {
  return (
    <div className={cn("border-t border-border/40 pt-8", className)}>
      <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-extra">
        Sample docket — not on-chain
      </p>
      <ol className="max-w-xl space-y-3">
        {EXAMPLE_GRIEVANCES.map((text, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 shrink-0 font-mono text-[10px] tabular-nums text-muted-extra">{i + 1}.</span>
            <span className="font-body text-sm leading-snug text-muted-foreground">
              &ldquo;{text}&rdquo;
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Outgoing testnet payments with memos; grievance rows can be marked resolved by the filer (issuer).
 */
export function SentTransactionsPanel({ refreshKey = 0, variant = "default" }) {
  const isLedger = variant === "ledger";
  const { isConnected, accountInfo, walletManager, showStatus, addEvent } = useWallet();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [cancellingHash, setCancellingHash] = useState(null);

  const address = accountInfo?.address;

  /** Ledger: real outbound memos first when connected; five hardcoded samples appended at the end. */
  const listRows = isLedger ? [...rows, ...LEDGER_FILL_ROWS] : rows;

  useEffect(() => {
    if (!address) {
      setRows([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const client = new Client(TESTNET_WSS);

    (async () => {
      setLoading(true);
      setError(null);
      try {
        await client.connect();
        const collected = [];
        let marker = undefined;
        for (let page = 0; page < 10; page += 1) {
          const resp = await client.request({
            command: "account_tx",
            account: address,
            ledger_index_min: -1,
            ledger_index_max: -1,
            limit: 50,
            ...(marker ? { marker } : {}),
          });
          collected.push(...(resp.result.transactions ?? []));
          marker = resp.result.marker;
          if (!marker) break;
        }

        if (cancelled) return;

        const resolutions = new Map();
        for (const entry of collected) {
          const tx = entry.tx;
          if (!tx || !entry.validated) continue;
          if (tx.TransactionType !== "Payment") continue;
          if (tx.Account !== address) continue;
          if (!tx.Memos?.length) continue;
          const hash = tx.hash;
          if (!hash) continue;
          const memos = decodeMemos(tx.Memos);
          const memoText = memos.map((m) => m.data).filter(Boolean).join("\n\n—\n\n");
          const resParsed = parsePettyLedgerResolutionMemo(memoText);
          if (resParsed && resParsed.filer === tx.Account) {
            const dateIso = typeof tx.date === "number" ? rippleTimeToISOTime(tx.date) : null;
            resolutions.set(resParsed.canceledTxHash, { resolutionHash: hash, dateIso });
          }
        }

        const out = [];
        for (const entry of collected) {
          const tx = entry.tx;
          if (!tx || !entry.validated) continue;
          if (tx.TransactionType !== "Payment") continue;
          if (tx.Account !== address) continue;
          if (!tx.Memos?.length) continue;

          const hash = tx.hash;
          if (!hash) continue;

          const memos = decodeMemos(tx.Memos);
          const memoText = memos.map((m) => m.data).filter(Boolean).join("\n\n—\n\n");

          let amountXrp = null;
          if (typeof tx.Amount === "string" && /^\d+$/.test(tx.Amount)) {
            try {
              amountXrp = dropsToXrp(tx.Amount);
            } catch {
              amountXrp = null;
            }
          }

          const dateIso = typeof tx.date === "number" ? rippleTimeToISOTime(tx.date) : null;

          const grievanceParsed = parsePettyLedgerGrievanceMemo(memoText);
          const resolutionParsed = parsePettyLedgerResolutionMemo(memoText);
          let kind = "other";
          if (resolutionParsed) kind = "resolution";
          else if (grievanceParsed) kind = "grievance";

          const resolvedBy = grievanceParsed ? resolutions.get(hash) ?? null : null;

          out.push({
            hash,
            destination: typeof tx.Destination === "string" ? tx.Destination : "—",
            amountXrp,
            dateIso,
            memoText,
            kind,
            grievanceParsed,
            resolutionParsed,
            resolvedBy,
          });
        }

        out.sort((a, b) => (b.dateIso || "").localeCompare(a.dateIso || ""));
        if (!cancelled) setRows(out);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load transactions");
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
        if (client.isConnected()) {
          try {
            await client.disconnect();
          } catch {
            /* ignore */
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      void (async () => {
        try {
          if (client.isConnected()) await client.disconnect();
        } catch {
          /* ignore */
        }
      })();
    };
  }, [address, refreshKey, refreshTick]);

  const handleRecordResolution = async (row) => {
    const g = row.grievanceParsed;
    if (!g || !address || !walletManager?.signAndSubmit) return;
    if (row.resolvedBy) return;

    const elig = getGrievanceResolutionEligibility(g);
    if (elig.state !== "allowed") {
      showStatus(
        elig.state === "too_late"
          ? "Too late to repair — this grievance stays on chain as filed."
          : "Resolution is only allowed when a correction deadline was set on the original memo.",
        "error"
      );
      return;
    }

    const memoPlain = buildGrievanceResolutionMemoText({
      originalTxHash: row.hash,
      filer: g.from,
      originalRecipient: g.to,
    });

    // Send 1 drop to the original recipient — not a self-payment. Many wallets hang or fail on
    // Account === Destination even though the ledger allows it.
    const transaction = {
      TransactionType: "Payment",
      Account: address,
      Destination: g.to,
      Amount: ONE_DROP,
      Memos: [
        {
          Memo: {
            MemoType: convertStringToHex("Emayan"),
            MemoFormat: convertStringToHex("text/plain"),
            MemoData: convertStringToHex(memoPlain),
          },
        },
      ],
    };

    setCancellingHash(row.hash);
    try {
      const txResult = await walletManager.signAndSubmit(transaction);
      const newHash = txResult.hash || "pending";
      showStatus("Resolution recorded (1-drop payment + memo to original recipient)", "success");
      addEvent("Grievance resolution submitted", { originalTx: row.hash, newHash });
      setRefreshTick((n) => n + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showStatus(`Could not record resolution: ${msg}`, "error");
      addEvent("Grievance resolution failed", e);
    } finally {
      setCancellingHash(null);
    }
  };

  if (!isConnected || !accountInfo) {
    if (!isLedger) {
      return (
        <Card className="border-dashed border-border/60 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Sent transactions (with memo)
            </CardTitle>
            <CardDescription className="font-body text-sm text-muted-foreground">
              Connect your wallet to load your testnet history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-0">
            <p className="font-body text-sm text-muted-foreground">
              Outgoing payments that include a memo will appear here after you connect.
            </p>
            <ExampleGrievancesSection className="mt-8" />
          </CardContent>
        </Card>
      );
    }
    /* Ledger without wallet: fall through — list shows hardcoded samples + connect hint below */
  }

  return (
    <div className="w-full">
      <div
        className={
          isLedger ? "mb-4 flex items-center justify-between" : "mb-8 flex items-center justify-between"
        }
      >
        <span
          className={
            isLedger
              ? "font-mono text-[10px] uppercase tracking-widest text-primary"
              : "font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          }
        >
          {isLedger ? "Outbound register" : "Your memos"}
        </span>
        <div className="flex items-center gap-1.5">
          {loading && (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
          )}
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
            XRPL testnet
          </span>
        </div>
      </div>

      {isLedger && (!isConnected || !accountInfo) ? (
        <p className="mb-4 rounded-lg bg-primary/[0.06] px-3 py-2.5 font-body text-xs leading-relaxed text-muted-foreground dark:bg-primary/10">
          <span className="font-mono text-[10px] uppercase tracking-wider text-primary">Sample docket</span>
          {" — "}
          Five entries below are examples (not on-chain). When you connect, your outbound memos appear
          above these samples at the end of the list.
        </p>
      ) : null}

      <p
        className={
          isLedger
            ? "mb-4 rounded-lg bg-muted/20 px-3 py-2 font-body text-xs leading-relaxed text-muted-foreground"
            : "mb-6 font-body text-sm text-muted-foreground"
        }
      >
        As <span className="text-foreground/90">issuer</span>, you may record a resolution only if the
        memo includes a correction deadline (filed with &quot;{CORRECTION_WINDOW_POLICY_LABEL}&quot;)
        and the deadline has not passed. Then sign a 1-drop payment to the original recipient with the
        resolution memo.
      </p>

      {error && (
        <p className="mb-4 font-mono text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {!isLedger && !loading && !error && rows.length === 0 && (
        <div
          className={
            isLedger
              ? "rounded-lg bg-muted/15 px-4 py-10 sm:px-6"
              : "rounded-lg bg-muted/10 px-4 py-10 sm:px-6"
          }
        >
          <div className="mx-auto flex max-w-md flex-col items-center gap-2 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="font-body text-sm text-muted-foreground">
              No outgoing payments with memos found for this account yet.
            </p>
            {isLedger && (
              <p className="font-mono text-[10px] text-muted-extra">The ledger is innocent until proven petty.</p>
            )}
          </div>
          <ExampleGrievancesSection className="mt-10" />
        </div>
      )}

      {listRows.length > 0 && (
        <ul
          className={cn(
            "flex flex-col",
            isLedger ? "gap-8 sm:gap-10" : "gap-10 sm:gap-12"
          )}
        >
          {listRows.map((row, rowIndex) => {
            const isIssuer =
              row.kind === "grievance" &&
              row.grievanceParsed &&
              row.grievanceParsed.from === address;
            const elig =
              row.kind === "grievance" && row.grievanceParsed
                ? getGrievanceResolutionEligibility(row.grievanceParsed)
                : { state: "no_window" };
            const canResolve =
              isIssuer && !row.resolvedBy && elig.state === "allowed";
            const busy = cancellingHash === row.hash;
            const entryNo = String(rowIndex + 1).padStart(2, "0");
            const entryTitle = row.kind === "resolution" ? "Resolution" : "Grievance";

            return (
              <li
                key={row.hash}
                className={cn(
                  "transition-colors",
                  isLedger &&
                    "rounded-2xl bg-card/80 p-4 shadow-sm dark:bg-card/50 sm:p-5"
                )}
              >
                {isLedger && (
                  <header className="mb-4 flex flex-wrap items-start justify-between gap-3 pb-1">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 font-mono text-base font-semibold tabular-nums text-primary sm:h-12 sm:w-12 sm:text-lg"
                        aria-label={`Entry number ${entryNo}`}
                      >
                        {entryNo}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <h2 className="font-serif text-xl font-normal tracking-tight text-foreground sm:text-2xl">
                          {entryTitle}
                        </h2>
                        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-extra">
                          Petty Ledger · Entry {entryNo}
                        </p>
                      </div>
                    </div>
                    {row.kind === "grievance" && row.resolvedBy ? (
                      <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-lg bg-muted/45 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground dark:bg-muted/30">
                        <span className="text-[9px] uppercase tracking-wider text-muted-extra">Status</span>
                        <span className="text-foreground/90">Resolved</span>
                        <a
                          href={txExplorerUrl(row.resolvedBy.resolutionHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-90"
                        >
                          {truncateMid(row.resolvedBy.resolutionHash, 6, 4)}
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                        </a>
                      </div>
                    ) : row.kind === "resolution" ? (
                      <span className="rounded-md bg-emerald-500/12 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-800 dark:bg-emerald-500/18 dark:text-emerald-100">
                        Resolution record
                      </span>
                    ) : null}
                  </header>
                )}

                {!isLedger && row.kind === "resolution" && (
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Resolution entry
                  </p>
                )}
                {!isLedger && row.kind === "grievance" && row.resolvedBy && (
                  <p className="mb-2 inline-flex items-center gap-2 rounded-md bg-muted/45 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                    Resolved on ledger
                    <a
                      href={txExplorerUrl(row.resolvedBy.resolutionHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 hover:opacity-90"
                    >
                      {truncateMid(row.resolvedBy.resolutionHash, 6, 4)}
                      <ExternalLink className="ml-0.5 inline h-3 w-3 opacity-70" aria-hidden />
                    </a>
                  </p>
                )}

                {row.kind === "resolution" ? (
                  <div
                    className={cn(
                      "mb-3",
                      isLedger && "rounded-xl bg-muted/25 px-3 py-3 sm:px-4 dark:bg-muted/20"
                    )}
                  >
                    <ResolutionMemoBody memoText={row.memoText} />
                    {row.hash ? (
                      <p className="mt-3">
                        <a
                          href={txExplorerUrl(row.hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-primary underline decoration-primary/30 underline-offset-4 hover:opacity-90"
                        >
                          View on-chain transaction
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                          <span className="text-muted-foreground no-underline">
                            ({truncateMid(row.hash, 8, 6)})
                          </span>
                        </a>
                      </p>
                    ) : null}
                  </div>
                ) : row.grievanceParsed ? (
                  <ParsedGrievanceMemo
                    parsed={row.grievanceParsed}
                    rawMemo={row.memoText}
                    txHash={row.isSynthetic ? undefined : row.hash}
                    variant={isLedger ? "ledger" : "default"}
                  />
                ) : (
                  <p className="mb-4 font-serif text-base font-normal leading-relaxed tracking-wide text-foreground sm:text-lg">
                    {row.memoText || "(empty memo)"}
                  </p>
                )}

                {isIssuer && row.kind === "grievance" && !row.resolvedBy && elig.state === "no_window" && (
                  <p className="mb-3 rounded-md bg-muted/25 py-2 pl-3 pr-2 font-body text-xs leading-relaxed text-muted-foreground">
                    No on-chain correction window: only grievances filed with &quot;
                    {CORRECTION_WINDOW_POLICY_LABEL}&quot; and a deadline can be resolved here.
                  </p>
                )}
                {isIssuer && row.kind === "grievance" && !row.resolvedBy && elig.state === "too_late" && (
                  <p className="mb-3 rounded-md bg-amber-500/10 py-2 pl-3 pr-2 font-body text-sm leading-relaxed text-amber-950 dark:text-amber-100/90">
                    Too late to repair — this is forever on chain.
                  </p>
                )}
                {isIssuer && row.kind === "grievance" && !row.resolvedBy && elig.state === "invalid_date" && (
                  <p className="mb-3 rounded-md bg-muted/25 py-2 pl-3 pr-2 font-mono text-xs text-muted-foreground">
                    This memo has a correction field that could not be read; resolution is blocked.
                  </p>
                )}
                {isIssuer &&
                  row.kind === "grievance" &&
                  !row.resolvedBy &&
                  elig.state === "allowed" &&
                  elig.until && (
                    <p className="mb-3 font-mono text-[10px] text-muted-foreground">
                      Correction window open until {elig.until.toLocaleString()}
                    </p>
                  )}

                {canResolve && (
                  <div className="mb-3 rounded-xl bg-primary/[0.09] p-3.5 dark:bg-primary/15">
                    <p className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-primary">
                      Repair window open — record resolution
                    </p>
                    <Button
                      type="button"
                      variant="default"
                      size="default"
                      disabled={busy || !walletManager?.signAndSubmit}
                      className="w-full font-mono text-xs uppercase tracking-wide shadow-md sm:w-auto"
                      onClick={() => handleRecordResolution(row)}
                      aria-label="Sign a one-drop payment to the original recipient with a resolution memo"
                    >
                      {busy ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />
                          Signing…
                        </>
                      ) : (
                        "Record resolution (1 drop + memo)"
                      )}
                    </Button>
                  </div>
                )}

                <div
                  className={cn(
                    "flex flex-wrap items-center gap-2.5",
                    isLedger && "mt-4 bg-muted/20 px-1 py-2.5 dark:bg-muted/15"
                  )}
                >
                  {row.kind !== "resolution" && !row.grievanceParsed ? (
                    <>
                      <a
                        href={txExplorerUrl(row.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-primary underline decoration-primary/35 underline-offset-4 hover:opacity-90"
                      >
                        View transaction
                        <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                        <span className="normal-case text-muted-foreground no-underline">
                          ({truncateMid(row.hash, 8, 6)})
                        </span>
                      </a>
                      <span className="text-muted-extra">·</span>
                    </>
                  ) : null}
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {row.amountXrp != null ? `${row.amountXrp} XRP` : "—"}
                  </span>
                  <span className="text-muted-extra">·</span>
                  {row.dateIso && (
                    <time className="font-mono text-[10px] text-muted-foreground" dateTime={row.dateIso}>
                      {new Date(row.dateIso).toLocaleString()}
                    </time>
                  )}
                  <span className="text-muted-extra">·</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    To {truncateMid(row.destination, 10, 10)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
