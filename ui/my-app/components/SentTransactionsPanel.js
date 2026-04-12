"use client";

import { useEffect, useState } from "react";
import { Client, convertHexToString, dropsToXrp, rippleTimeToISOTime } from "xrpl";
import { useWallet } from "./providers/WalletProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { txExplorerUrl, TESTNET_WSS } from "../lib/xrpl-explorer";
import { ExternalLink, Inbox, Loader2 } from "lucide-react";

function decodeMemos(memos) {
  if (!memos?.length) return [];
  return memos.map((entry) => {
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
  }).filter(Boolean);
}

function truncateMid(s, left = 6, right = 4) {
  if (!s || s.length <= left + right + 1) return s;
  return `${s.slice(0, left)}…${s.slice(-right)}`;
}

export function SentTransactionsPanel({ refreshKey = 0 }) {
  const { isConnected, accountInfo } = useWallet();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const address = accountInfo?.address;

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

          const dateIso =
            typeof tx.date === "number" ? rippleTimeToISOTime(tx.date) : null;

          out.push({
            hash,
            destination: typeof tx.Destination === "string" ? tx.Destination : "—",
            amountXrp,
            dateIso,
            memoText,
          });
        }

        out.sort((a, b) => (b.dateIso || "").localeCompare(a.dateIso || ""));
        setRows(out);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load transactions");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
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
  }, [address, refreshKey]);

  if (!isConnected || !accountInfo) {
    return (
      <Card className="border-dashed border-border/60 bg-card/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sent transactions (with memo)</CardTitle>
          <CardDescription>Connect your wallet to load your testnet history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Outgoing payments that include a memo will appear here after you connect.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex min-h-[320px] flex-col md:min-h-[480px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Your sent transactions</CardTitle>
            <CardDescription>Outgoing payments that include a memo (testnet)</CardDescription>
          </div>
          {loading && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden pt-0">
        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 bg-secondary/20 py-12 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              No outgoing payments with memos found for this account yet.
            </p>
          </div>
        )}
        {rows.length > 0 && (
          <ul className="max-h-[min(70vh,560px)] space-y-3 overflow-y-auto pr-1">
            {rows.map((row) => (
              <li
                key={row.hash}
                className="rounded-lg border border-border/80 bg-secondary/25 p-3 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                  <a
                    href={txExplorerUrl(row.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                  >
                    {truncateMid(row.hash, 8, 6)}
                    <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                  </a>
                  {row.dateIso && (
                    <time
                      className="text-[11px] text-muted-foreground"
                      dateTime={row.dateIso}
                    >
                      {new Date(row.dateIso).toLocaleString()}
                    </time>
                  )}
                </div>
                <div className="mt-2 space-y-1.5 text-xs">
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <span className="text-muted-foreground">To</span>
                    <code className="break-all text-[11px] text-foreground/90">
                      {truncateMid(row.destination, 10, 10)}
                    </code>
                  </div>
                  {row.amountXrp != null && (
                    <div>
                      <span className="text-muted-foreground">Amount </span>
                      <span className="font-medium tabular-nums">{row.amountXrp} XRP</span>
                    </div>
                  )}
                  <div className="mt-2 rounded-md border border-border/60 bg-background/40 p-2.5">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Memo
                    </p>
                    <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-foreground/95">
                      {row.memoText || "(empty)"}
                    </pre>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
