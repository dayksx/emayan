"use client";

import "./globals.css";
import { WalletProvider } from "../components/providers/WalletProvider";
import { WalletBootstrap } from "../components/WalletBootstrap";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-body text-foreground antialiased">
        <WalletProvider>
          <WalletBootstrap />
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
