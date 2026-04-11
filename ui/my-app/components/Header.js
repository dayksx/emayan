"use client";

import { WalletConnector } from "./WalletConnector";
import { useWalletManager } from "../hooks/useWalletManager";
import { useWallet } from "./providers/WalletProvider";
import { Badge } from "./ui/badge";

export function Header() {
  useWalletManager();
  const { statusMessage } = useWallet();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/90 to-primary/60 shadow-lg shadow-primary/15 ring-1 ring-white/10">
            <span className="font-bold text-sm text-primary-foreground">X</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Scaffold-XRP
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              XRPL · Testnet
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          {statusMessage && (
            <Badge
              className="max-w-[min(100%,18rem)] truncate shadow-none"
              variant={
                statusMessage.type === "success"
                  ? "success"
                  : statusMessage.type === "error"
                  ? "destructive"
                  : statusMessage.type === "warning"
                  ? "warning"
                  : "secondary"
              }
              title={statusMessage.message}
            >
              {statusMessage.message}
            </Badge>
          )}
          <WalletConnector />
        </div>
      </div>
    </header>
  );
}
