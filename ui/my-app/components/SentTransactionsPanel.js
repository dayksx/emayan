"use client";

import { useEffect, useState } from "react";
import { Client, convertHexToString, dropsToXrp, rippleTimeToISOTime } from "xrpl";
import { useWallet } from "./providers/WalletProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { txExplorerUrl, TESTNET_WSS } from "../lib/xrpl-explorer";
import { ExternalLink, Inbox, Loader2 } from "lucide-react";

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

/** Uses design tokens from globals (:root light paper theme). */
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

          const dateIso = typeof tx.date === "number" ? rippleTimeToISOTime(tx.date) : null;

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
      <Card className="border-dashed border-border/60 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Sent transactions (with memo)
          </CardTitle>
          <CardDescription className="font-body text-sm text-muted-foreground">
            Connect your wallet to load your testnet history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-body text-sm text-muted-foreground">
            Outgoing payments that include a memo will appear here after you connect.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Your memos
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

      {error && (
        <p className="mb-4 font-mono text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-border py-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="font-body text-sm text-muted-foreground">
            No outgoing payments with memos found for this account yet.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="max-h-[min(70vh,560px)] space-y-0 overflow-y-auto pr-1">
          {rows.map((row) => (
            <li key={row.hash} className="border-b border-border py-6 transition-colors sm:py-8">
              <p className="mb-4 font-serif text-base font-normal leading-relaxed tracking-wide text-foreground sm:text-lg">
                {row.memoText || "(empty memo)"}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={txExplorerUrl(row.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-sm border border-blue-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary hover:opacity-90"
                >
                  {truncateMid(row.hash, 8, 6)}
                  <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                </a>
                <span className="text-muted-extra">·</span>
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
          ))}
        </ul>
      )}
    </div>
  );
}
