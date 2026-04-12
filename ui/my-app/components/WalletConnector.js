"use client";

import { useState, useEffect } from "react";
import { useWallet } from "./providers/WalletProvider";
import { useWalletConnector } from "../hooks/useWalletConnector";

/* Match petty-ledger :root light paper + primary (hsl 212 43% 30%) */
const THEMES = {
  petty: {
    "--xc-background-color": "hsl(40, 24%, 95%)",
    "--xc-background-secondary": "hsl(40, 20%, 92%)",
    "--xc-background-tertiary": "hsl(40, 15%, 88%)",
    "--xc-text-color": "hsl(60, 4%, 11%)",
    "--xc-text-muted-color": "rgba(60, 55, 50, 0.72)",
    "--xc-primary-color": "hsl(212, 43%, 30%)",
  },
};

export function WalletConnector() {
  const { walletManager } = useWallet();
  const walletConnectorRef = useWalletConnector(walletManager);
  const [currentTheme] = useState("petty");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const registerWebComponent = async () => {
      try {
        const { WalletConnectorElement } = await import("xrpl-connect");

        if (!customElements.get("xrpl-wallet-connector")) {
          customElements.define("xrpl-wallet-connector", WalletConnectorElement);
        }
      } catch (error) {
        console.error("Failed to register wallet connector:", error);
      }
    };

    registerWebComponent();
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <xrpl-wallet-connector
      ref={walletConnectorRef}
      id="wallet-connector"
      style={{
        ...THEMES[currentTheme],
        "--xc-font-family": "inherit",
        "--xc-border-radius": "12px",
        "--xc-modal-box-shadow": "0 24px 64px rgba(0, 0, 0, 0.12)",
      }}
      primary-wallet="xaman"
    />
  );
}
