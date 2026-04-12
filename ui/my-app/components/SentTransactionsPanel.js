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
  buildGrievanceResolutionMemoText,
  parsePettyLedgerGrievanceMemo,
  parsePettyLedgerResolutionMemo,
} from "../lib/grievance-memo";
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

/** 1 drop — minimum XRP amount for a memo-only follow-up tx. */
const ONE_DROP = "1";

/**
 * Outgoing testnet payments with memos; grievance rows can be marked resolved by the filer (issuer).
 */
export function SentTransactionsPanel({ refreshKey = 0 }) {
  const { isConnected, accountInfo, walletManager, showStatus, addEvent } = useWallet();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [cancellingHash, setCancellingHash] = useState(null);

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
  }, [address, refreshKey, refreshTick]);

  const handleRecordResolution = async (row) => {
    const g = row.grievanceParsed;
    if (!g || !address || !walletManager?.signAndSubmit) return;
    if (row.resolvedBy) return;

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

      <p className="mb-6 font-body text-sm text-muted-foreground">
        If you <span className="text-foreground/90">filed</span> a grievance (issuer), you can record a
        resolution by signing a 1-drop payment to the original grievance recipient with a resolution
        memo (avoids wallet bugs with self-payments).
      </p>

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
          {rows.map((row) => {
            const isIssuer =
              row.kind === "grievance" &&
              row.grievanceParsed &&
              row.grievanceParsed.from === address;
            const canResolve = isIssuer && !row.resolvedBy;
            const busy = cancellingHash === row.hash;

            return (
              <li key={row.hash} className="border-b border-border py-6 transition-colors sm:py-8">
                {row.kind === "resolution" && (
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Resolution entry
                  </p>
                )}
                {row.kind === "grievance" && row.resolvedBy && (
                  <p className="mb-2 inline-flex items-center gap-2 rounded-sm border border-border bg-secondary/40 px-2 py-1 font-mono text-[10px] text-muted-foreground">
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
                  <p className="mb-4 font-mono text-sm leading-relaxed text-foreground/95">
                    {row.memoText || "(empty memo)"}
                  </p>
                ) : (
                  <p className="mb-4 font-serif text-base font-normal leading-relaxed tracking-wide text-foreground sm:text-lg">
                    {row.memoText || "(empty memo)"}
                  </p>
                )}

                {canResolve && (
                  <div className="mb-4">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={busy || !walletManager?.signAndSubmit}
                      className="font-mono text-xs"
                      onClick={() => handleRecordResolution(row)}
                      aria-label="Sign a one-drop payment to the original recipient with a resolution memo"
                    >
                      {busy ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />
                          Signing…
                        </>
                      ) : (
                        "Record resolution (1 drop to recipient + memo)"
                      )}
                    </Button>
                  </div>
                )}

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
            );
          })}
        </ul>
      )}
    </div>
  );
}
