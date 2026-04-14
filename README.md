# ✨😊 Petty Ledger — *Technical README*

**Hackathon context:** Emayan / Petty Ledger — Grievance ledger (April 2026).

**Paris Blockchain Week:** Petty Ledger was the **winning project** in the **💰 Why Not?** track — the brief for that track:

> The most unexpected, bizarre, or delightfully absurd XRPL project wins. We don't know what we're looking for, and neither do you. Yet. Forget best practices, think outside the ledger.

**Built by** [@emma_murf](https://github.com/emma_murf) and [@dayksx](https://github.com/dayksx) teaming up.

## Resources

| | |
|:---|:---|
| 📈 | **Slides:** [Petty Ledger (Figma deck)](https://www.figma.com/deck/GYLKCbvMV1foLxShiHjzPh/Petty-Ledger?node-id=3-235&t=rYTA3IFupbS4pnXM-1&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1) |
| 💻 | **dapp:** [emayan.vercel.app](https://emayan.vercel.app/) |
| 🤖 | **bot:** [@PettyLedgerBot on Telegram](https://t.me/PettyLedgerBot) |

---

## The pitch (read this first)

> *The XRPL doesn’t pick sides in your drama — it just timestamps it for the rest of human civilization.* 🌍✨

**Emayan** is the codename. **Petty Ledger** is the vibe: turn beef into **bytes**, shade into **signatures**, and optional **XRP** into “donations” to causes the other person would *loathe*. You get receipts; they get notified; the ledger stays petty forever. 📜🔥

| | |
|:---|:---|
| 📝 | **File** a grievance — text on-chain, no “I never said that” |
| 💸 | **Stake** XRP in **`petty_ledger`** (XRPL smart vault) — hold, release, or forfeit with clear rules |
| 🎯 | **Name** a subject — their wallet is the one that can authorize certain payouts |
| 🎭 | **Pick** a cause — symbolic justice, maximum spite, minimum ambiguity |
| 📱 | **Flex** cards & Telegram off-chain — the chain handles truth; we handle drama |

**TL;DR:** Wallet in, grievance recorded, money moves only where the contract says. No “trust me bro” — **trust the hash.** ✅🤝

*Tone check:* we’re half serious about verifiable records, half unserious about how fun petty can be. If you smile at the table, the README did its job. 😌

---

## What this repository actually contains

There is **no standalone backend service** (no Postgres, no cron worker, no `/api/grievance` REST layer) in this repo. The app is:

| Piece | Role |
|------|------|
| **[`ui/my-app/`](ui/my-app/)** | **Next.js** UI: wallet connection (**xrpl-connect** + browser wallets), **client-signed** `Payment` transactions with **plain-text memos**, confirmation page (`/filed`), ledger-style pages with **seeded** demo feed data. |
| **[`ui/my-app/app/api/notify-telegram/`](ui/my-app/app/api/notify-telegram/route.js)** | **Optional** route: forwards notification text to the **Telegram Bot HTTP API** (`sendMessage`). Used so the browser never holds `TELEGRAM_BOT_TOKEN`. Not a general REST API for XRPL. |
| **[`contracts/petty-ledger/`](contracts/petty-ledger/)** | **`petty_ledger`** WASM (**Rust** → Bedrock smart **vault**): deposit with structured memo, hold XRP, **subject-only** withdrawals to filer, subject, or donation account. See **[`contracts/petty-ledger/README.md`](contracts/petty-ledger/README.md)** for memo layout and build/deploy. |
| **[`ai/`](ai/)** | Optional **Telegram AI agent** (OpenAI + LangGraph) that answers questions using this README as context. Separate process from the web app. |

**On-chain filing in the UI today** is a standard **`Payment`** to a **classic address** you choose (e.g. counterparty or treasury), with memo type **`Emayan`** and **`text/plain`** payload built by [`ui/my-app/lib/grievance-memo.js`](ui/my-app/lib/grievance-memo.js). That path is **not** the same memo format as the **`petty_ledger`** vault (`PETTY_LEDGER_V1` + `subject:` / `donation:` hex lines) — wiring the UI to the vault is an integration step when you deploy the contract.

---

## Introduction & repository layout

**Emayan** is a **grievance ledger on the XRP Ledger** — public, verifiable complaints, optionally paired with symbolic XRP movement and **Telegram** notifications around those on-chain facts.

**Petty Ledger** in [`contracts/petty-ledger/`](contracts/petty-ledger/) is the **`petty_ledger`** smart contract (`src/lib.rs`). It is the on-chain authority for **structured memos**, **holding** XRP in the vault, and **authorizing withdrawals** to filer, subject, or donation addresses per the rules in that file.

### Project structure

| Path | Role |
|------|------|
| [`ui/my-app/src/components/EmayanPettyGrievanceForm.tsx`](ui/my-app/src/components/EmayanPettyGrievanceForm.tsx) | Primary filing form: memo text, optional **correction deadline** in memo (Type 4 UX), Telegram notify. |
| [`ui/my-app/components/GrievanceForm.js`](ui/my-app/components/GrievanceForm.js) | Simpler alternate form (same memo + notify pattern). |
| [`ui/my-app/lib/grievance-memo.js`](ui/my-app/lib/grievance-memo.js) | Memo line format, parsing, resolution memo helpers. |
| [`ui/my-app/hooks/useWalletManager.js`](ui/my-app/hooks/useWalletManager.js) | **xrpl-connect** `WalletManager` (testnet), adapters (Xaman, WalletConnect, Crossmark, Gem, Otsu). |
| [`ui/my-app/src/lib/seedGrievances.ts`](ui/my-app/src/lib/seedGrievances.ts) | Demo feed entries for **`LiveFeed`** / **`LedgerFeed`** (not a live chain subscription). |

---

## Filing types (UX) vs on-chain reality

The main form derives a **filing type** (1–4) from UI fields: anonymous vs accused, mock “cause” and timing, etc. **What always hits the chain today** is one **`Payment`** with a **single-line plain-text memo** (plus optional `Correction until: ISO8601` for the deadline path). **Mock donation labels** (RLUSD strings, cause pickers, “escrow locked” copy) are **presentation**; they are called out in code as not wired to separate XRPL **Escrow** or RLUSD flows unless you add that integration.

| Type | UX intent | On-chain in this repo |
|------|-----------|-------------------------|
| 1 — No recipient | Anonymous record | Same `Payment` pattern; memo omits correction window when no accused path is used in the form. |
| 2 — Recipient, no mock cause | Record + notify | Memo + amount to chosen `Destination`. |
| 3 — Immediate “donation” (mock) | Narrative | Still one `Payment` to the address you enter — not a separate automated cause-wallet router unless you build it. |
| 4 — Deadline | Correction window | Memo includes `Correction until: …` when the form collects a valid deadline. |

For **stake custody rules** (who may release XRP and to which addresses), see **`petty_ledger`** in [`contracts/petty-ledger/src/lib.rs`](contracts/petty-ledger/src/lib.rs) — not native `EscrowCreate` / `EscrowFinish` in the current UI.

---

## Core logic — snippets from this repo

### 1. Memo text (explorer-friendly one-liner)

From [`ui/my-app/lib/grievance-memo.js`](ui/my-app/lib/grievance-memo.js):

```javascript
export function buildGrievanceMemoText({ filer, to, amountXrp, grievanceBody, correctionUntilIso }) {
  const causeText = grievanceBody.trim().replace(/\s+/g, " ");
  let line = `Petty Ledger - Cause: ${causeText} - Amount: ${amountXrp} XRP - From: ${filer} - To: ${to}`;
  if (correctionUntilIso && String(correctionUntilIso).trim()) {
    line += ` - Correction until: ${String(correctionUntilIso).trim()}`;
  }
  return truncateUtf8Bytes(line, MAX_MEMO_UTF8_BYTES);
}
```

Resolution follow-up memos use the `Petty Ledger - RESOLVED - Cancels tx: …` shape from the same module.

### 2. Client-signed `Payment` + memo

From [`ui/my-app/src/components/EmayanPettyGrievanceForm.tsx`](ui/my-app/src/components/EmayanPettyGrievanceForm.tsx) (same pattern as `GrievanceForm.js`):

```typescript
const transaction = {
  TransactionType: "Payment" as const,
  Account: partyA,
  Destination: dest,
  Amount: drops,
  Memos: [
    {
      Memo: {
        MemoType: convertStringToHex("Emayan"),
        MemoFormat: convertStringToHex("text/plain"),
        MemoData: convertStringToHex(memoPlainText),
      },
    },
  ],
};

const txResult = await manager.signAndSubmit(transaction);
```

After submission, the form **`fetch`es** `POST /api/notify-telegram` with `{ chatIdOrUsername, text }` built by [`ui/my-app/lib/telegram-grievance-text.js`](ui/my-app/lib/telegram-grievance-text.js).

### 3. Wallet connection (no server-side signing for filing)

From [`ui/my-app/hooks/useWalletManager.js`](ui/my-app/hooks/useWalletManager.js):

```javascript
const manager = new WalletManager({
  adapters,
  network: "testnet",
  autoConnect: false,
  logger: { level: "info" },
});
// …
await manager.signAndSubmit(transaction);
```

Network constants for explorers/faucets also live in [`ui/my-app/lib/networks.js`](ui/my-app/lib/networks.js) (testnet, devnet, alphanet).

### 4. Telegram proxy route (optional)

From [`ui/my-app/app/api/notify-telegram/route.js`](ui/my-app/app/api/notify-telegram/route.js): **`POST`** accepts JSON `{ chatIdOrUsername, text }`, requires **`TELEGRAM_BOT_TOKEN`**, optionally duplicates to **`TELEGRAM_NOTIFY_CHAT_ID`**. **`GET`** calls Telegram **`getMe`** for a quick token check.

### 5. Smart vault — `petty_ledger` (Rust)

Deposit requires memo header **`PETTY_LEDGER_V1`** and **`subject:` / `donation:`** lines (40 hex chars each). Withdrawals are **subject-only**; `Destination` must be filer, subject, or donation. See [`contracts/petty-ledger/src/lib.rs`](contracts/petty-ledger/src/lib.rs):

```rust
/// **Deposit path** (incoming `Payment` to the vault): …
/// require memo with `PETTY_LEDGER_V1` plus `subject:` / `donation:` hex lines …

/// **Withdraw path** (subject releases stake): …
/// only the **subject** may sign. `Destination` must be one of:
/// - **Filer** — cancel amicably; return stake to the filer (`REFUND`).
/// - **Subject** — subject receives the escrow …
/// - **Donation** — forfeit stake to the disliked cause.
```

Full protocol text and memo examples: **[`contracts/petty-ledger/README.md`](contracts/petty-ledger/README.md)**.

---

## “Live” feed in the UI

[`ui/my-app/src/components/LiveFeed.tsx`](ui/my-app/src/components/LiveFeed.tsx) and [`LedgerFeed.tsx`](ui/my-app/src/components/ledger/LedgerFeed.tsx) render **`seedGrievances`** from [`ui/my-app/src/lib/seedGrievances.ts`](ui/my-app/src/lib/seedGrievances.ts). They are **demo content** for the hackathon UI, not a WebSocket subscription to cause wallets. A production feed could subscribe with **xrpl.js** in the client or a small indexer — that layer is **not** implemented here.

---

## Cards & confirmation copy

Card-style copy and the **`/filed`** confirmation page ([`ui/my-app/src/views/FiledView.tsx`](ui/my-app/src/views/FiledView.tsx)) follow the **four-type** narrative (titles vary by `filingType`). Telegram bodies are plain text from **`buildGrievanceTelegramText`** (no certificate PNG pipeline in-repo).

---

## Environment variables (web app)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_XAMAN_API_KEY` | Optional Xaman adapter ([`useWalletManager.js`](ui/my-app/hooks/useWalletManager.js)). |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional WalletConnect adapter. |
| `TELEGRAM_BOT_TOKEN` | Required for `/api/notify-telegram` to send messages. |
| `TELEGRAM_NOTIFY_CHAT_ID` | Optional second recipient for notifications. |

Do **not** commit secrets. The Telegram bot token stays server-side in the Next.js route only.

---

## Product roadmap (not implemented as a monolith backend here)

Earlier design notes described a **full backend**: Postgres **`grievances`** table, **`POST /api/grievance`**, SSE feed, **cron** + **`EscrowFinish`**, node-canvas **certificates**, magic-link **resolve** endpoints. Those are **useful product targets** but **not** shipped as a single service in this repository. If you add them, prefer keeping **XRPL signing** where it belongs (user wallet for cancel; dedicated hot wallet only for flows you truly cannot do in-browser) and document the trust model.

---

## Notes

- **XRPL L1** transactions are the source of truth for what the wallet actually submits.
- **Flat fee** on XRPL is tiny compared to donation size — still a good pitch line.
- **`petty_ledger`** **does not** send Telegram messages; the app / bot does.
- For AI-assisted Q&A about the project, see [`ai/README.md`](ai/README.md) and point **`PETTY_LEDGER_README_PATH`** at this file.
