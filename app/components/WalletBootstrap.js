"use client";

import { useWalletManager } from "../hooks/useWalletManager";

/** Initializes xrpl-connect once inside WalletProvider (replaces Header-only init). */
export function WalletBootstrap() {
  useWalletManager();
  return null;
}
