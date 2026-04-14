"use client";

import { WalletConnector } from "./WalletConnector";
import { useWallet } from "./providers/WalletProvider";
import { Badge } from "./ui/badge";

function truncateAddr(addr) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function Header() {
  const { statusMessage, isConnected, accountInfo } = useWallet();

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
              Emayan
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              XRPL · Testnet
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          {statusMessage && (
            <Badge
              className="max-w-[min(100%,12rem)] truncate shadow-none sm:max-w-[min(100%,14rem)]"
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
          {isConnected && accountInfo && (
            <div
              className="hidden min-w-0 max-w-[min(100%,20rem)] items-center gap-2 rounded-lg border border-border/80 bg-secondary/50 px-2.5 py-1.5 text-left md:flex"
              title={accountInfo.address}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] leading-tight text-foreground">
                  {truncateAddr(accountInfo.address)}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {accountInfo.walletName} · {accountInfo.network}
                </p>
              </div>
            </div>
          )}
          {isConnected && accountInfo && (
            <div className="flex min-w-0 max-w-[10rem] flex-col rounded-md border border-border/80 bg-secondary/50 px-2 py-1 md:hidden">
              <span className="truncate font-mono text-[10px] text-foreground">
                {truncateAddr(accountInfo.address)}
              </span>
            </div>
          )}
          <WalletConnector />
        </div>
      </div>
    </header>
  );
}
