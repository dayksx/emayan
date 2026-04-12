"use client";

import { useCallback, useEffect } from "react";
import { useWallet } from "../components/providers/WalletProvider";

// Configuration - Replace with your API keys
const XAMAN_API_KEY = process.env.NEXT_PUBLIC_XAMAN_API_KEY || "";
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

/** One WalletManager per tab — avoids duplicate init under React Strict Mode (dev). */
let sharedManager = null;
/** Event handlers attached once; `manager.on` would stack duplicates otherwise. */
let listenersBound = false;

export function useWalletManager() {
  const { walletManager, setWalletManager, setIsConnected, setAccountInfo, addEvent, showStatus } =
    useWallet();

  const updateConnectionState = useCallback(
    (manager) => {
      const connected = manager.connected;
      setIsConnected(connected);

      if (connected) {
        const account = manager.account;
        const wallet = manager.wallet;

        if (account && wallet) {
          setAccountInfo({
            address: account.address,
            network: `${account.network.name} (${account.network.id})`,
            walletName: wallet.name,
          });
        }
      } else {
        setAccountInfo(null);
      }
    },
    [setIsConnected, setAccountInfo]
  );

  useEffect(() => {
    let cancelled = false;

    const initWalletManager = async () => {
      try {
        if (sharedManager) {
          if (cancelled) return;
          setWalletManager(sharedManager);
          updateConnectionState(sharedManager);
          return;
        }

        const {
          WalletManager,
          XamanAdapter,
          WalletConnectAdapter,
          CrossmarkAdapter,
          GemWalletAdapter,
          OtsuAdapter,
        } = await import("xrpl-connect");

        if (cancelled) return;

        // Another Strict Mode pass may have finished while we awaited import.
        if (sharedManager) {
          setWalletManager(sharedManager);
          updateConnectionState(sharedManager);
          return;
        }

        const adapters = [];

        if (XAMAN_API_KEY) {
          adapters.push(new XamanAdapter({ apiKey: XAMAN_API_KEY }));
        }

        if (WALLETCONNECT_PROJECT_ID) {
          adapters.push(new WalletConnectAdapter({ projectId: WALLETCONNECT_PROJECT_ID }));
        }

        adapters.push(new CrossmarkAdapter());
        adapters.push(new GemWalletAdapter());
        adapters.push(new OtsuAdapter());

        const manager = new WalletManager({
          adapters,
          network: "testnet",
          // Do not auto-reconnect on load — that calls `connect(walletId)` and pops the extension.
          // User connects explicitly via the wallet button / modal.
          autoConnect: false,
          logger: { level: "info" },
        });

        sharedManager = manager;

        if (!listenersBound) {
          listenersBound = true;
          manager.on("connect", (account) => {
            addEvent("Connected", account);
            updateConnectionState(manager);
          });

          manager.on("disconnect", () => {
            addEvent("Disconnected", null);
            updateConnectionState(manager);
          });

          manager.on("error", (error) => {
            addEvent("Error", error);
            showStatus(error.message, "error");
          });
        }

        if (cancelled) return;

        setWalletManager(manager);

        if (!manager.connected) {
          showStatus("Please connect a wallet to get started", "info");
        } else {
          showStatus("Wallet reconnected from previous session", "success");
          updateConnectionState(manager);
        }

        console.log("XRPL Connect initialized", manager);
      } catch (error) {
        console.error("Failed to initialize wallet connection:", error);
        showStatus("Failed to initialize wallet connection", "error");
      }
    };

    initWalletManager();

    return () => {
      cancelled = true;
    };
  }, [setWalletManager, updateConnectionState, addEvent, showStatus]);

  return { walletManager };
}
