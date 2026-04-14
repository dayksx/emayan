"use client";

import { useState, useEffect } from "react";
import { useWallet } from "./providers/WalletProvider";
import { useWalletConnector } from "../hooks/useWalletConnector";

/* Hex values mirror app/globals.css :root (paper + slate primary). xrpl-connect’s
 * updateDerivedColors() parses only #rrggbb for hover math — keep base + primary as hex. */
const THEMES = {
  petty: {
    "--xc-background-color": "#f5f3ef",
    "--xc-background-secondary": "#eeebe6",
    "--xc-background-tertiary": "#e9e6e1",
    "--xc-text-color": "#1d1d1a",
    "--xc-text-muted-color": "rgba(29, 29, 26, 0.48)",
    "--xc-primary-color": "#2b4a6d",

    "--xc-modal-background": "#ffffff",
    "--xc-modal-box-shadow": "0 24px 48px rgba(29, 29, 26, 0.09)",

    "--xc-overlay-background": "rgba(29, 29, 26, 0.4)",
    "--xc-overlay-backdrop-filter": "blur(6px)",

    "--xc-connect-button-font-size": "14px",
    "--xc-connect-button-font-weight": "500",
    "--xc-connect-button-border-radius": "3px",
    "--xc-connect-button-color": "#1d1d1a",
    "--xc-connect-button-background": "#f5f3ef",
    "--xc-connect-button-border": "1px solid rgba(43, 74, 109, 0.22)",

    "--xc-primary-button-color": "#ffffff",
    "--xc-primary-button-background": "#2b4a6d",
    "--xc-primary-button-border-radius": "3px",
    "--xc-primary-button-font-weight": "500",

    "--xc-secondary-button-color": "#1d1d1a",
    "--xc-secondary-button-background": "#eeebe6",
    "--xc-secondary-button-border-radius": "3px",
    "--xc-secondary-button-font-weight": "500",

    "--xc-focus-color": "#2b4a6d",
    "--xc-loading-border-color": "#2b4a6d",
  },
};

const PORTAL_SELECTORS = "[data-xrpl-overlay-portal], [data-xrpl-account-modal-portal]";

const EXTRA_HOST_VARS = [
  "--xc-font-family",
  "--xc-border-radius",
  "--xc-primary-button-hover-background",
  "--xc-connect-button-hover-background",
  "--xc-account-address-button-hover-color",
];

/** xrpl-connect renders the modal in a body portal. If --xc-* vars are missing there,
 * primary CTA text inherits .modal’s foreground (dark on blue). */
function syncWalletPortalTheme(hostEl, theme) {
  if (typeof document === "undefined" || !hostEl) return;
  const cs = getComputedStyle(hostEl);
  document.querySelectorAll(PORTAL_SELECTORS).forEach((portal) => {
    Object.keys(theme).forEach((key) => {
      const fromHost = cs.getPropertyValue(key).trim();
      const value = fromHost || theme[key];
      if (value) portal.style.setProperty(key, value);
    });
    EXTRA_HOST_VARS.forEach((key) => {
      const v = cs.getPropertyValue(key).trim();
      if (v) portal.style.setProperty(key, v);
    });
  });
}

export function WalletConnector() {
  const { walletManager } = useWallet();
  const walletConnectorRef = useWalletConnector(walletManager);
  const [currentTheme] = useState("petty");
  const [isClient, setIsClient] = useState(false);
  const theme = THEMES[currentTheme];

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

  useEffect(() => {
    if (!isClient) return;

    const run = () => {
      requestAnimationFrame(() => {
        const host = document.getElementById("wallet-connector");
        if (host) syncWalletPortalTheme(host, theme);
      });
    };

    run();
    const mo = new MutationObserver(run);
    mo.observe(document.body, { childList: true });
    return () => mo.disconnect();
  }, [isClient, theme]);

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
        "--xc-border-radius": "9px",
      }}
    />
  );
}
