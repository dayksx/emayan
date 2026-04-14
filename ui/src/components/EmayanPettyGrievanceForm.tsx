"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { convertStringToHex, xrpToDrops } from "xrpl";
import { useWallet } from "../../components/providers/WalletProvider";
import {
  CORRECTION_WINDOW_POLICY_LABEL,
  buildGrievanceMemoText,
} from "../../lib/grievance-memo";
import { buildGrievanceTelegramText } from "../../lib/telegram-grievance-text";
import { txExplorerUrl } from "../../lib/xrpl-explorer";
import {
  REVENGE_DONATION_CAUSES,
  REVENGE_DONATION_SECTION_INTRO,
  getRevengeDonationCauseLabel,
  getRevengeDonationCauseQuip,
  type RevengeDonationCause,
} from "@/lib/revenge-donation-causes";

/** Petty Ledger escrow wallet — all grievance payments are sent here. */
const PETTY_LEDGER_ESCROW_ADDRESS = "r9ogmjMT1XHQivnX5UzqzxohBagKPDJHrP";

/** On-chain payment amount presets (XRP string for `xrpToDrops`). */
const DONATION_XRP_OPTIONS = [
  { xrp: "0.5" as const, label: "0.5 XRP", tooltip: "A PITTANCE" },
  { xrp: "1" as const, label: "1 XRP", tooltip: "POINTED" },
  { xrp: "2" as const, label: "2 XRP", tooltip: "VINDICTIVE" },
];

type DonationXrpChoice = (typeof DONATION_XRP_OPTIONS)[number]["xrp"] | "";

type Props = {
  onSubmitted?: () => void;
};

type WalletApi = {
  walletManager: unknown;
  isConnected: boolean;
  accountInfo: { address: string } | null;
  addEvent: (name: string, data: unknown) => void;
  showStatus: (message: string, type: string) => void;
};

type SubmitResult =
  | null
  | { status: "error"; message: string }
  | {
      status: "success";
      hash: string;
      telegramStatus: string;
      telegramError: string | null;
      telegramPartialFailures?: string | null;
    };

export default function EmayanPettyGrievanceForm({ onSubmitted }: Props) {
  const router = useRouter();
  const { walletManager, isConnected, accountInfo, addEvent, showStatus } = useWallet() as WalletApi;

  const [grievance, setGrievance] = useState("");
  const [accused, setAccused] = useState("");
  const [donationXrp, setDonationXrp] = useState<DonationXrpChoice>("");
  const [telegramHandle, setTelegramHandle] = useState("");
  const [confirmStage, setConfirmStage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult>(null);
  const [anonymous, setAnonymous] = useState(false);

  const [causeId, setCauseId] = useState("");
  const [timing, setTiming] = useState<"" | "immediate" | "deadline">("");
  const [deadline, setDeadline] = useState("");
  const [filerTelegram, setFilerTelegram] = useState("");

  const hasAccused = accused.trim().length > 0;
  const autoAnonymous = !hasAccused;

  const selectedCauseLabel = causeId ? getRevengeDonationCauseLabel(causeId) : undefined;
  const selectedCauseQuip = causeId ? getRevengeDonationCauseQuip(causeId) : undefined;

  const filingType = (() => {
    if (!hasAccused) return 1;
    if (!causeId) return 2;
    if (timing === "immediate") return 3;
    if (timing === "deadline") return 4;
    return 2;
  })();

  const submitLabel: Record<number, string> = {
    1: "Enter into the permanent record →",
    2: "File this grievance →",
    3: "File and donate immediately →",
    4: "File and lock the escrow →",
  };

  const runOnchainSubmit = async () => {
    setSubmitResult(null);

    const fail = (msg: string) => {
      showStatus(msg, "error");
      setSubmitResult({ status: "error", message: msg });
    };

    if (!walletManager) {
      fail("Wallet is still initializing. Wait a moment and try again.");
      return;
    }

    const manager = walletManager as {
      account?: { address: string };
      signAndSubmit: (tx: unknown) => Promise<{ hash?: string; id?: string | number }>;
    };

    if (!manager.account) {
      fail("Connect your wallet first (use the wallet button in the header).");
      return;
    }

    const partyA = manager.account.address.trim();
    const dest = PETTY_LEDGER_ESCROW_ADDRESS;

    if (dest === partyA) {
      fail("Connect a wallet that is not the Petty Ledger escrow address.");
      return;
    }
    if (grievance.trim().length < 10) {
      fail("Describe the grievance in at least 10 characters.");
      return;
    }

    if (!donationXrp) {
      fail("Choose a donation amount.");
      return;
    }
    const amountXrp = donationXrp;

    let drops: string;
    try {
      drops = xrpToDrops(amountXrp);
    } catch {
      fail("Invalid donation amount.");
      return;
    }
    if (BigInt(drops) < 1n) {
      fail("Amount must be at least 1 drop.");
      return;
    }

    const tg = telegramHandle.trim();

    let correctionUntilIso: string | undefined;
    if (filingType === 4) {
      if (!deadline.trim()) {
        fail(
          `Set a correction deadline when you choose "${CORRECTION_WINDOW_POLICY_LABEL}".`
        );
        return;
      }
      const d = new Date(deadline);
      if (Number.isNaN(d.getTime())) {
        fail("Invalid correction deadline.");
        return;
      }
      correctionUntilIso = d.toISOString();
    }

    const associationLabel = causeId.trim()
      ? getRevengeDonationCauseLabel(causeId.trim())
      : undefined;

    const memoPlainText = buildGrievanceMemoText({
      filer: partyA,
      to: dest,
      amountXrp,
      grievanceBody: grievance,
      correctionUntilIso,
      ...(associationLabel ? { associationLabel } : {}),
    });

    setIsLoading(true);
    try {
      const transaction = {
        TransactionType: "Payment" as const,
        Account: partyA,
        Destination: dest,
        Amount: drops,
        Memos: [
          {
            Memo: {
              MemoType: convertStringToHex("Emayan"),
              MemoFormat: convertStringToHex("text/plain"),
              MemoData: convertStringToHex(memoPlainText),
            },
          },
        ],
      };

      const txResult = await manager.signAndSubmit(transaction);
      const hash = txResult.hash || "Pending";

      let telegramStatus: string = "skipped";
      let telegramError: string | null = null;
      let telegramPartialFailures: string | null = null;
      try {
        const notifyRes = await fetch("/api/notify-telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatIdOrUsername: tg,
            text: buildGrievanceTelegramText({
              filer: partyA,
              recipient: dest,
              amountXrp,
              grievanceBody: grievance,
              txHash: hash,
            }),
          }),
        });
        const rawBody = await notifyRes.text();
        let notifyJson: Record<string, unknown> | null = null;
        try {
          notifyJson = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
        } catch {
          telegramStatus = "failed";
          telegramError = `notify returned invalid JSON (HTTP ${notifyRes.status})`;
        }
        if (telegramStatus !== "failed" && notifyJson) {
          if (notifyJson.skipped) {
            telegramStatus =
              notifyJson.reason === "telegram_bot_token_not_set"
                ? "not_configured"
                : "skipped";
          } else if (notifyJson.ok) {
            telegramStatus = "sent";
            const partial = notifyJson.partial;
            const failures = notifyJson.failures;
            if (
              partial &&
              Array.isArray(failures) &&
              failures.length > 0
            ) {
              telegramPartialFailures = (
                failures as { chat_id: string; error: string }[]
              )
                .map((f) => `${f.chat_id}: ${f.error}`)
                .join(" · ");
            }
          } else {
            telegramStatus = "failed";
            telegramError =
              typeof notifyJson.error === "string"
                ? notifyJson.error
                : `HTTP ${notifyRes.status}`;
          }
        }
      } catch {
        telegramStatus = "failed";
        telegramError = "notify request failed";
      }

      showStatus("Grievance recorded on-chain", "success");
      addEvent("Grievance payment submitted", { hash, telegramStatus });

      setSubmitResult({
        status: "success",
        hash,
        telegramStatus,
        telegramError,
        telegramPartialFailures,
      });

      try {
        sessionStorage.setItem(
          "emayanFiled",
          JSON.stringify({
            filingType,
            accused: accused.trim() || "The accused",
            accusedTelegram: telegramHandle.trim(),
            grievance: grievance.trim(),
            caseNumber: String(Math.floor(Math.random() * 90000) + 10000),
            txHash: hash,
            telegramStatus,
          })
        );
      } catch {
        /* ignore */
      }

      setDonationXrp("");
      setGrievance("");
      setTelegramHandle("");
      setAccused("");
      setCauseId("");
      setTiming("");
      setDeadline("");
      setFilerTelegram("");
      setConfirmStage(false);
      onSubmitted?.();
      router.push(`/filed?tx=${encodeURIComponent(hash)}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const full = `Transaction failed: ${message}`;
      showStatus(full, "error");
      setSubmitResult({ status: "error", message: full });
      addEvent("Grievance tx failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !accountInfo) {
      showStatus("Connect your wallet first", "error");
      return;
    }
    if (filingType === 1) {
      await runOnchainSubmit();
      return;
    }
    if (!confirmStage) {
      setConfirmStage(true);
      return;
    }
    await runOnchainSubmit();
  };

  if (!isConnected || !accountInfo) {
    return (
      <div className="rounded-sm border border-blue-border bg-background/95 p-6 md:p-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
          Wallet required
        </p>
        <p className="font-body text-sm text-muted-foreground leading-relaxed">
          Connect your wallet (button in the header) to file a grievance on XRPL testnet. Your
          payment memo will hold the grievance text; Telegram notify uses the server bot token when
          configured.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" id="file" noValidate>
      <section className="space-y-6">
        <div>
          <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-2">
            1. State your grievance
          </label>
          <textarea
            className="form-textarea-underline"
            placeholder='For replying "sounds good" to a dinner invite, then never showing.'
            value={grievance}
            onChange={(e) => {
              setGrievance(e.target.value);
              setConfirmStage(false);
            }}
            required
          />
        </div>

        <div>
          <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-2">
            2. The accused <span className="text-muted-extra">(optional)</span>
          </label>
          <input
            type="text"
            className="form-input-underline"
            placeholder="Name or nickname"
            value={accused}
            onChange={(e) => {
              setAccused(e.target.value);
              setConfirmStage(false);
            }}
          />
        </div>

        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="accent-primary mt-0.5"
              checked={anonymous || autoAnonymous}
              disabled={autoAnonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            <span className="font-body text-sm text-muted-foreground leading-relaxed">
              {autoAnonymous
                ? "With no accused named, this filing is anonymous."
                : "File anonymously — the public ledger shows the grievance but not your name as filer"}
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-sm border border-blue-border/60 bg-secondary/20 p-4 md:p-5 space-y-5">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-primary mb-1">3. Payment</p>
          <p className="font-mono text-[8px] uppercase tracking-wider text-muted-extra">XRPL testnet · Petty Ledger escrow</p>
        </div>

        <p className="font-body text-xs text-muted-foreground leading-relaxed">
          Sent to Petty Ledger escrow:{" "}
          <span className="font-mono text-[11px] text-foreground break-all">{PETTY_LEDGER_ESCROW_ADDRESS}</span>
        </p>

        <div>
          <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-3">
            Donation amount
          </label>
          <div className="flex flex-wrap gap-2">
            {DONATION_XRP_OPTIONS.map((opt) => {
              const tipId = `donation-tier-${opt.xrp}`;
              return (
                <div key={opt.xrp} className="group relative inline-flex">
                  <button
                    type="button"
                    aria-describedby={tipId}
                    onClick={() => {
                      setDonationXrp(opt.xrp);
                      setConfirmStage(false);
                    }}
                    className={`font-mono text-xs px-4 py-2 rounded-sm border transition-colors duration-150 ${
                      donationXrp === opt.xrp
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-foreground border-blue-border hover:border-primary"
                    }`}
                  >
                    {opt.label}
                  </button>
                  <span
                    id={tipId}
                    role="tooltip"
                    className="pointer-events-none absolute top-[calc(100%+6px)] left-1/2 z-20 w-max max-w-[min(240px,calc(100vw-2rem))] -translate-x-1/2 translate-y-1 rounded-sm border border-blue-border/90 bg-popover/95 px-2.5 py-1.5 text-center font-mono text-[9px] uppercase tracking-widest text-primary shadow-sm backdrop-blur-sm opacity-0 transition duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
                  >
                    {opt.tooltip}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-2">
            Accused&apos;s Telegram <span className="text-muted-extra">(optional · notify)</span>
          </label>
          <input
            type="text"
            className="form-input-underline"
            placeholder="@username or numeric chat ID — leave blank to skip DM"
            value={telegramHandle}
            onChange={(e) => {
              setTelegramHandle(e.target.value);
              setConfirmStage(false);
            }}
          />
        </div>
      </section>

      <section className="rounded-sm border border-blue-border/40 bg-secondary/10 p-4 md:p-5 space-y-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-primary mb-1">4. In their honor</p>
          <p className="font-body text-xs text-muted-foreground leading-relaxed">
            {REVENGE_DONATION_SECTION_INTRO}. Tap one; with an accused named, this also sets notification
            timing in the next step.
          </p>
        </div>

        <div className="space-y-3">
          <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block">
            Donate to
          </label>

          <div
            role="radiogroup"
            aria-label="Symbolic donation association"
            className="rounded-sm border border-blue-border bg-background/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          >
            <ul className="m-0 list-none divide-y divide-blue-border p-0">
              {REVENGE_DONATION_CAUSES.map((c: RevengeDonationCause) => {
                const selected = causeId === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`w-full text-left py-1.5 px-2.5 font-body text-xs leading-tight transition-colors duration-200 ease-out ${
                        selected
                          ? "bg-primary/[0.07] text-foreground shadow-[inset_2px_0_0_0_hsl(var(--primary)/0.45)]"
                          : "text-foreground/95 hover:bg-muted/30 active:bg-muted/45"
                      }`}
                      onClick={() => {
                        setCauseId(c.id);
                        setConfirmStage(false);
                      }}
                    >
                      {c.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selectedCauseLabel && (
            <div className="rounded-sm border border-primary bg-primary px-3 py-2 text-primary-foreground shadow-sm">
              <p className="font-mono text-[9px] uppercase tracking-widest text-primary-foreground/75 mb-1">
                Selected
              </p>
              <p className="font-body text-sm font-medium leading-snug">{selectedCauseLabel}</p>
              {selectedCauseQuip && (
                <p className="mt-1.5 font-body text-xs italic leading-snug text-primary-foreground/85 border-t border-primary-foreground/15 pt-1.5">
                  {selectedCauseQuip}
                </p>
              )}
            </div>
          )}
        </div>

        {causeId && (
          <div className="space-y-4 pt-1 animate-fade-in-down">
            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-3">
                How would you like to proceed?
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer font-body text-sm text-foreground">
                  <input
                    type="radio"
                    name="timing"
                    className="accent-primary"
                    checked={timing === "deadline"}
                    onChange={() => {
                      setTiming("deadline");
                      setConfirmStage(false);
                    }}
                  />
                  {CORRECTION_WINDOW_POLICY_LABEL}
                </label>
                <label className="flex items-center gap-3 cursor-pointer font-body text-sm text-foreground">
                  <input
                    type="radio"
                    name="timing"
                    className="accent-primary"
                    checked={timing === "immediate"}
                    onChange={() => {
                      setTiming("immediate");
                      setConfirmStage(false);
                    }}
                  />
                  Donate immediately — no warning
                </label>
              </div>
            </div>
            {timing === "deadline" && (
              <div className="space-y-4 animate-fade-in-down">
                <div>
                  <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-2">
                    Deadline for correction <span className="text-muted-extra">(stored in payment memo)</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input-underline font-body"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-2">
                    Your Telegram handle
                  </label>
                  <input
                    type="text"
                    className="form-input-underline"
                    placeholder="@yourhandle"
                    value={filerTelegram}
                    onChange={(e) => setFilerTelegram(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <button
        type="submit"
        disabled={!grievance.trim() || !donationXrp || isLoading}
        className={`w-full font-mono text-sm py-3.5 rounded-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
          confirmStage
            ? "bg-foreground text-background hover:opacity-90"
            : "bg-primary text-primary-foreground hover:opacity-90"
        }`}
      >
        {isLoading
          ? "Signing & notifying…"
          : confirmStage
            ? "Are you sure? This is permanent."
            : submitLabel[filingType] ?? submitLabel[2]!}
      </button>

      {submitResult && (
        <div
          role="status"
          className={`rounded-sm border p-4 text-left font-body text-sm ${
            submitResult.status === "error"
              ? "border-destructive/50 bg-destructive/5 text-destructive"
              : "border-blue-border bg-secondary/30 text-foreground"
          }`}
        >
          {submitResult.status === "error" && <p className="leading-relaxed">{submitResult.message}</p>}
          {submitResult.status === "success" && (
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                On-chain transaction
              </p>
              <p className="font-mono text-xs break-all text-foreground">{submitResult.hash}</p>
              <a
                href={txExplorerUrl(submitResult.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block font-mono text-xs text-primary underline underline-offset-2 hover:opacity-90"
              >
                View on XRPL testnet explorer →
              </a>
              <p className="text-xs text-muted-foreground">
                Telegram notify:{" "}
                {submitResult.telegramStatus === "sent" && (
                  <>
                    sent.
                    {submitResult.telegramPartialFailures && (
                      <span className="block mt-1 text-amber-600 dark:text-amber-500 font-mono text-[11px] break-words">
                        Partial: {submitResult.telegramPartialFailures}
                      </span>
                    )}
                  </>
                )}
                {submitResult.telegramStatus === "not_configured" && "not configured on server (memo is still on-chain)."}
                {submitResult.telegramStatus === "skipped" && "skipped."}
                {submitResult.telegramStatus === "failed" && (
                  <>
                    failed
                    {submitResult.telegramError ? ` — ${submitResult.telegramError}` : "."}
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      <p className="font-mono text-[9px] text-muted-extra text-center tracking-wider">
        Powered by XRP Ledger · Emayan testnet
      </p>
    </form>
  );
}
