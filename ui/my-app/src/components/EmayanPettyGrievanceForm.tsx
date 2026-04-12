"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { convertStringToHex, isValidClassicAddress, xrpToDrops } from "xrpl";
import { useWallet } from "../../components/providers/WalletProvider";
import {
  CORRECTION_WINDOW_POLICY_LABEL,
  buildGrievanceMemoText,
} from "../../lib/grievance-memo";
import { buildGrievanceTelegramText } from "../../lib/telegram-grievance-text";
import { txExplorerUrl } from "../../lib/xrpl-explorer";

/** Visual-only options from the Petty Ledger mock UI (not written on-chain). */
const MOCK_DONATION_CAUSES = [
  { id: "flat-earth", emoji: "🌍", name: "The Flat Earth Society" },
  { id: "man-utd", emoji: "⚽", name: "Manchester United Foundation" },
  { id: "nickelback", emoji: "🎸", name: "Nickelback" },
  { id: "pigeon", emoji: "🐦", name: "Penny's Pigeon Aid" },
];

const MOCK_AMOUNTS = [
  { value: "0.50 RLUSD", label: "a pittance" },
  { value: "1.00 RLUSD", label: "pointed" },
  { value: "2.00 RLUSD", label: "aggressive" },
];

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
  const [destination, setDestination] = useState("");
  const [amountXrp, setAmountXrp] = useState("");
  const [telegramHandle, setTelegramHandle] = useState("");
  const [confirmStage, setConfirmStage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult>(null);

  /** Mock-only state (UI preview; escrow / RLUSD not wired). */
  const [mockCauseId, setMockCauseId] = useState("");
  const [mockAmount, setMockAmount] = useState("0.50 RLUSD");
  const [timing, setTiming] = useState<"" | "immediate" | "deadline">("");
  const [deadline, setDeadline] = useState("");
  const [filerTelegram, setFilerTelegram] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const hasAccused = accused.trim().length > 0;
  const autoAnonymous = !hasAccused;

  const filingType = (() => {
    if (!hasAccused) return 1;
    if (!mockCauseId) return 2;
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
    const dest = destination.trim();

    if (!isValidClassicAddress(dest)) {
      fail("Enter a valid XRPL address for the recipient (on-chain section).");
      return;
    }
    if (dest === partyA) {
      fail("Recipient address must differ from your own.");
      return;
    }
    if (grievance.trim().length < 10) {
      fail("Describe the grievance in at least 10 characters.");
      return;
    }

    let drops: string;
    try {
      drops = xrpToDrops(amountXrp);
    } catch {
      fail("Enter a valid XRP amount (e.g. 1 or 0.25).");
      return;
    }
    if (BigInt(drops) < 1n) {
      fail("Amount must be at least 1 drop.");
      return;
    }

    const tg = telegramHandle.trim();
    if (!tg) {
      fail("Enter the culprit’s Telegram @username or chat ID for notification.");
      return;
    }

    let correctionUntilIso: string | undefined;
    if (filingType === 4) {
      if (!deadline.trim()) {
        fail(
          `Set a correction deadline when you choose "${CORRECTION_WINDOW_POLICY_LABEL}" (mock filing step).`
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

    const memoPlainText = buildGrievanceMemoText({
      filer: partyA,
      to: dest,
      amountXrp,
      grievanceBody: grievance,
      correctionUntilIso,
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
          if (notifyJson.skipped && notifyJson.reason === "telegram_bot_token_not_set") {
            telegramStatus = "not_configured";
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

      setDestination("");
      setAmountXrp("");
      setGrievance("");
      setTelegramHandle("");
      setAccused("");
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
    /** Filing type 1: no optional mock flow — submit memo payment on first click ("Enter into the permanent record"). */
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
    <form onSubmit={handleSubmit} className="space-y-6" id="file" noValidate>
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
          placeholder="Lucas"
          value={accused}
          onChange={(e) => {
            setAccused(e.target.value);
            setConfirmStage(false);
          }}
        />
      </div>

      <div className="rounded-sm border border-blue-border/60 bg-secondary/20 p-4 space-y-4">
        <p className="font-mono text-[9px] uppercase tracking-widest text-primary">
          On-chain (XRPL testnet)
        </p>
        <div>
          <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-2">
            Recipient XRPL address
          </label>
          <input
            type="text"
            className="form-input-underline font-mono text-[13px]"
            placeholder="r… (classic address)"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setConfirmStage(false);
            }}
            required
          />
        </div>
        <div>
          <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-2">
            Amount (XRP)
          </label>
          <input
            type="text"
            inputMode="decimal"
            className="form-input-underline"
            placeholder="e.g. 1"
            value={amountXrp}
            onChange={(e) => {
              setAmountXrp(e.target.value);
              setConfirmStage(false);
            }}
            required
          />
        </div>
        <div>
          <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-2">
            Culprit&apos;s Telegram (notify)
          </label>
          <input
            type="text"
            className="form-input-underline"
            placeholder="@username or numeric chat ID"
            value={telegramHandle}
            onChange={(e) => {
              setTelegramHandle(e.target.value);
              setConfirmStage(false);
            }}
            required
          />
        </div>
      </div>

      <div className="relative rounded-sm border border-dashed border-border/80 p-4 opacity-75">
        <p className="font-mono text-[8px] uppercase tracking-widest text-muted-extra mb-3">
          Mock UI — donation / escrow (not connected yet)
        </p>
        <div>
          <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-2">
            In their honor, donate to <span className="text-muted-extra">(preview only)</span>
          </label>
          <select
            className="form-input-underline font-body cursor-pointer"
            value={mockCauseId}
            onChange={(e) => {
              setMockCauseId(e.target.value);
              setConfirmStage(false);
            }}
          >
            <option value="">— pick a charity (mock) —</option>
            {MOCK_DONATION_CAUSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </div>

        {mockCauseId && (
          <div className="space-y-4 mt-4 animate-fade-in-down">
            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-3">
                Donation amount (mock)
              </label>
              <div className="flex flex-wrap gap-2">
                {MOCK_AMOUNTS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => {
                      setMockAmount(a.value);
                      setConfirmStage(false);
                    }}
                    className={`font-mono text-xs px-4 py-2 rounded-sm border transition-colors duration-150 ${
                      mockAmount === a.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-foreground border-blue-border hover:border-primary"
                    }`}
                  >
                    {a.value}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-3">
                How would you like to proceed? (mock)
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
                  Give them a chance to correct it
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
                    Deadline for correction (stored in payment memo)
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
                    Your Telegram handle (mock)
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
      </div>

      <div className="pt-2">
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
              ? "No recipient entered — this grievance will be filed anonymously."
              : "File anonymously — your grievance feeds the public ledger but your name is withheld"}
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={!grievance.trim() || isLoading}
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
