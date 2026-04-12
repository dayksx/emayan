/** Matches `useWalletManager` testnet + public explorer links */
export const TESTNET_WSS = "wss://s.altnet.rippletest.net:51233";

export function txExplorerUrl(hash) {
  return `https://testnet.xrpl.org/transactions/${hash}`;
}
