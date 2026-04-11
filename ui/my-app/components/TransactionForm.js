"use client";

import { useState } from "react";
import { useWallet } from "./providers/WalletProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ArrowRightLeft, CheckCircle2, XCircle } from "lucide-react";

export function TransactionForm() {
  const { walletManager, isConnected, addEvent, showStatus } = useWallet();
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!walletManager || !walletManager.account) {
      showStatus("Please connect a wallet first", "error");
      return;
    }

    try {
      setIsLoading(true);
      setResult(null);

      const transaction = {
        TransactionType: "Payment",
        Account: walletManager.account.address,
        Destination: destination,
        Amount: amount,
      };

      const txResult = await walletManager.signAndSubmit(transaction);

      setResult({
        success: true,
        hash: txResult.hash || "Pending",
        id: txResult.id,
      });

      showStatus("Transaction submitted successfully!", "success");
      addEvent("Transaction Submitted", txResult);

      setDestination("");
      setAmount("");
    } catch (error) {
      setResult({
        success: false,
        error: error.message,
      });
      showStatus(`Transaction failed: ${error.message}`, "error");
      addEvent("Transaction Failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="border-dashed border-border/60 bg-card/40">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground">
              <ArrowRightLeft className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-base">Send XRP</CardTitle>
              <CardDescription>Available after you connect</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Sign and submit Payment transactions to another address. Connect your wallet first
            to enable the form.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Send XRP</CardTitle>
        <CardDescription>Payment to another address (testnet)</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="destination">Destination Address</Label>
            <Input
              id="destination"
              type="text"
              placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3HMfXoQT"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (drops)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="1000000"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">1 XRP = 1,000,000 drops</p>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="h-10 w-full font-medium shadow-md shadow-primary/10"
          >
            {isLoading ? "Signing & submitting…" : "Sign & submit"}
          </Button>
        </form>

        {result && (
          <Alert variant={result.success ? "success" : "destructive"} className="mt-4">
            {result.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>{result.success ? "Transaction Submitted" : "Transaction Failed"}</AlertTitle>
            <AlertDescription>
              {result.success ? (
                <div className="space-y-1">
                  <p className="font-mono text-xs break-all">Hash: {result.hash}</p>
                  {result.id && <p className="text-xs">ID: {result.id}</p>}
                  <p className="text-xs">Transaction has been signed and submitted to the ledger</p>
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
