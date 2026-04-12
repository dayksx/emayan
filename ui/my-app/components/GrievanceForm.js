"use client";

import { useState } from "react";
import { convertStringToHex, isValidClassicAddress, xrpToDrops } from "xrpl";
import { useWallet } from "./providers/WalletProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertTriangle, CheckCircle2, Send, XCircle } from "lucide-react";
import { buildGrievanceMemoText } from "../lib/grievance-memo";
import { buildGrievanceTelegramText } from "../lib/telegram-grievance-text";

const textareaClass =
  "min-h-[120px] w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50";

export function GrievanceForm({ onSubmitted }) {
  const { walletManager, isConnected, accountInfo, addEvent, showStatus } = useWallet();
  const [destination, setDestination] = useState("");
  const [amountXrp, setAmountXrp] = useState("");
  const [grievance, setGrievance] = useState("");
  const [cause, setCause] = useState("");
  const [telegramHandle, setTelegramHandle] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!walletManager?.account) {
      showStatus("Connect your wallet first", "error");
      return;
    }

    const partyA = walletManager.account.address.trim();
    const dest = destination.trim();

    if (!isValidClassicAddress(dest)) {
      showStatus("Enter a valid XRPL address for the recipient", "error");
      return;
    }
    if (dest === partyA) {
      showStatus("Recipient address must differ from your own", "error");
      return;
    }
    if (cause.trim().length < 2) {
      showStatus("Enter a cause for the on-chain memo (at least 2 characters)", "error");
      return;
    }
    if (grievance.trim().length < 10) {
      showStatus("Describe the grievance in at least 10 characters", "error");
      return;
    }

    let drops;
    try {
      drops = xrpToDrops(amountXrp);
    } catch {
      showStatus("Enter a valid XRP amount (e.g. 1 or 0.25)", "error");
      return;
    }
    if (BigInt(drops) < 1n) {
      showStatus("Amount must be at least 1 drop", "error");
      return;
    }

    const tg = telegramHandle.trim();
    if (!tg) {
      showStatus("Enter the culprit’s Telegram @username or chat ID for notification", "error");
      return;
    }

    const causeLabel = cause.trim();
    const memoPlainText = buildGrievanceMemoText({
      filer: partyA,
      to: dest,
      amountXrp,
      grievanceBody: grievance,
    });

    try {
      setIsLoading(true);
      setResult(null);

      const transaction = {
        TransactionType: "Payment",
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

      const txResult = await walletManager.signAndSubmit(transaction);
      const hash = txResult.hash || "Pending";

      let telegramStatus = "skipped";
      let telegramError = null;
      let telegramPartialFailures = null;
      try {
        const notifyRes = await fetch("/api/notify-telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatIdOrUsername: tg,
            text: buildGrievanceTelegramText({
              filer: partyA,
              recipient: dest,
              cause: causeLabel,
              amountXrp,
              grievanceBody: grievance,
              txHash: hash,
            }),
          }),
        });
        const rawBody = await notifyRes.text();
        let notifyJson = null;
        try {
          notifyJson = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          telegramStatus = "failed";
          telegramError = `notify returned invalid JSON (HTTP ${notifyRes.status})`;
        }
        if (telegramStatus !== "failed") {
          if (notifyJson.skipped && notifyJson.reason === "telegram_bot_token_not_set") {
            telegramStatus = "not_configured";
          } else if (notifyJson.ok) {
            telegramStatus = "sent";
            if (
              notifyJson.partial &&
              Array.isArray(notifyJson.failures) &&
              notifyJson.failures.length > 0
            ) {
              telegramPartialFailures = notifyJson.failures
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

      setResult({
        success: true,
        hash,
        id: txResult.id,
        telegramStatus,
        telegramError,
        telegramPartialFailures,
      });

      showStatus("Grievance recorded on-chain", "success");
      addEvent("Grievance payment submitted", { hash, cause: causeLabel, telegramStatus });

      setDestination("");
      setAmountXrp("");
      setCause("");
      setGrievance("");
      setTelegramHandle("");
      onSubmitted?.();
    } catch (error) {
      setResult({
        success: false,
        error: error.message,
      });
      showStatus(`Transaction failed: ${error.message}`, "error");
      addEvent("Grievance tx failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected || !accountInfo) {
    return (
      <Card className="border-dashed border-border/60 bg-card/40">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-base">File a grievance</CardTitle>
              <CardDescription>Connect your wallet to continue</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You will send a testnet payment whose memo field contains your grievance as readable text
            (plus cause and addresses). Telegram notify is optional if the server has a bot token.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">File a grievance</CardTitle>
        <CardDescription>
          Your grievance is stored as plain text in the transaction memo (visible on explorers). Optional
          Telegram ping.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="destination">Recipient XRPL address</Label>
            <Input
              id="destination"
              type="text"
              placeholder="r… address (who this grievance & payment concern)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (XRP)</Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="e.g. 1"
              value={amountXrp}
              onChange={(e) => setAmountXrp(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              This is the XRP amount for this payment transaction (converted to drops on submit).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cause">Cause summary (Telegram notify)</Label>
            <Input
              id="cause"
              type="text"
              placeholder="Short label for the Telegram ping (not the on-chain memo line)"
              value={cause}
              onChange={(e) => setCause(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="grievance">Your grievance (on-chain memo as Cause: …)</Label>
            <textarea
              id="grievance"
              className={textareaClass}
              placeholder="Describe what happened and what you expect…"
              value={grievance}
              onChange={(e) => setGrievance(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              The memo is one line: Petty Ledger — Cause (this text) — amount — from/to. UTF-8{" "}
              <code className="text-[11px]">text/plain</code>. Very long text may be truncated.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegram">Culprit’s Telegram (notify)</Label>
            <Input
              id="telegram"
              type="text"
              placeholder="@username or numeric chat ID"
              value={telegramHandle}
              onChange={(e) => setTelegramHandle(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              This can be any @username or
              numeric chat id — you do not put your own id here unless you want the notice yourself.
              Telegram only allows the bot to DM someone after that person has opened your bot and sent{" "}
              <code className="text-[11px]">/start</code> once (that is Telegram’s rule, not ours).
              Optionally, <code className="text-[11px]">TELEGRAM_NOTIFY_CHAT_ID</code> in{" "}
              <code className="text-[11px]">.env</code> sends an extra copy to you as the site operator
              for debugging; it is not required for notifying arbitrary handles.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="h-10 w-full font-medium shadow-md shadow-primary/10"
          >
            {isLoading ? (
              "Signing & notifying…"
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" aria-hidden />
                Submit payment & grievance
              </>
            )}
          </Button>
        </form>

        {result && (
          <Alert variant={result.success ? "success" : "destructive"} className="mt-4">
            {result.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>{result.success ? "Submitted" : "Failed"}</AlertTitle>
            <AlertDescription>
              {result.success ? (
                <div className="space-y-2">
                  <p className="font-mono text-xs break-all">Tx hash: {result.hash}</p>
                  {result.id != null && <p className="text-xs">ID: {result.id}</p>}
                  <p className="text-xs">
                    Telegram:{" "}
                    {result.telegramStatus === "sent" && (
                      <>
                        notification sent.
                        {result.telegramPartialFailures && (
                          <span className="block mt-1 text-amber-600 dark:text-amber-500 font-mono text-[11px] break-words">
                            Partial: {result.telegramPartialFailures}
                          </span>
                        )}
                      </>
                    )}
                    {result.telegramStatus === "not_configured" &&
                      "bot token not set on server — memo is still on-chain."}
                    {result.telegramStatus === "skipped" && "not sent."}
                    {result.telegramStatus === "failed" && (
                      <>
                        could not send (check handle and that they started the bot).
                        {result.telegramError && (
                          <span className="block mt-1 text-muted-foreground font-mono text-[11px] break-words">
                            {result.telegramError}
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <p>{result.error}</p>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
