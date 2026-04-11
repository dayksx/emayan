"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "../components/providers/WalletProvider";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen`}>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
