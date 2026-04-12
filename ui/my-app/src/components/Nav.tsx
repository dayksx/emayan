"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Send, Youtube } from "lucide-react";
import { WalletConnector } from "../../components/WalletConnector";
import { useWallet } from "../../components/providers/WalletProvider";
import { Badge } from "../../components/ui/badge";

function truncateAddr(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

type NavWallet = {
  statusMessage: { message: string; type: string } | null;
  isConnected: boolean;
  accountInfo: { address: string; walletName: string; network: string } | null;
};

const Nav = () => {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { statusMessage, isConnected, accountInfo } = useWallet() as NavWallet;

  return (
    <nav className="mx-auto flex w-full max-w-wide items-center justify-between px-6 py-5">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="font-serif text-2xl font-extralight leading-none tracking-tight text-foreground md:text-3xl">
            Petty Ledger
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <a
            href="https://youtu.be/u8Oq7BmSdNw"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/50 transition-colors hover:text-[#FF0000]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
            aria-label="Watch on YouTube"
          >
            <Youtube className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={1.5} />
          </a>
          <a
            href="https://t.me/PettyLedgerBot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/50 transition-colors hover:text-[#229ED9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
            aria-label="Petty Ledger on Telegram"
          >
            <Send className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={1.5} />
          </a>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-4 sm:gap-6">
        {statusMessage && (
          <Badge
            className="inline-flex max-w-[min(100%,10rem)] truncate shadow-none lg:max-w-[14rem]"
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
            className="hidden min-w-0 max-w-[16rem] flex-col rounded-sm border border-border bg-secondary/50 px-2 py-1 text-left md:flex"
            title={accountInfo.address}
          >
            <p className="truncate font-mono text-[10px] leading-tight text-foreground">
              {truncateAddr(accountInfo.address)}
            </p>
            <p className="truncate text-[9px] text-muted-foreground">
              {accountInfo.walletName} · {accountInfo.network}
            </p>
          </div>
        )}
        {!isHome && (
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back
          </Link>
        )}
        <Link
          href="/ledger"
          className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          The Ledger
        </Link>
        <WalletConnector />
      </div>
    </nav>
  );
};

export default Nav;
