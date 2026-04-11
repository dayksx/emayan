"use client";

import { useWallet } from "./providers/WalletProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Wallet } from "lucide-react";

export function AccountInfo() {
  const { isConnected, accountInfo } = useWallet();

  if (!isConnected || !accountInfo) {
    return (
      <Card className="border-dashed border-border/60 bg-card/40">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground">
              <Wallet className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-base">Account</CardTitle>
              <CardDescription>Connect a wallet to see your details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Use <span className="font-medium text-foreground/90">Connect</span> in the header
            to link Crossmark, Gem, or another supported wallet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Account</CardTitle>
        <CardDescription>Connected wallet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5 rounded-lg border border-border/80 bg-secondary/30 p-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Address
          </span>
          <code className="block break-all text-xs font-mono text-foreground/95">
            {accountInfo.address}
          </code>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-secondary/20 px-3 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">Network</span>
          <span className="text-sm font-medium">{accountInfo.network}</span>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-secondary/20 px-3 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">Wallet</span>
          <span className="text-sm font-medium">{accountInfo.walletName}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Use the wallet menu in the header to disconnect.
        </p>
      </CardContent>
    </Card>
  );
}
