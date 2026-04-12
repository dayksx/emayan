# Petty Ledger — XRPL smart vault

**Hackathon context:** Sunday April 12, 2026 — a grievance ledger on the **XRP Ledger**. People file complaints, optionally attach **XRP** to a “cause” the other party would dislike, and notify participants (e.g. via Telegram) off-chain. **On-chain, Petty Ledger is this smart vault contract:** it is the system of record for **recording** a grievance envelope, **holding** XRP, and **authorizing withdrawals** — not a separate REST layer for money movement.

---

## Role of this smart contract

| Responsibility | Where it lives |
|----------------|----------------|
| Grievance text + metadata in a **standard memo** | XRPL `Payment` / vault interaction — memo on deposit |
| **Locking XRP** in escrow-like custody | **This vault** (`on_deposit`) |
| **Releasing** XRP to filer, subject, or donation address | **This vault** (`on_withdraw`) |
| Telegram cards, magic links, certificates, public feed UI | **Off-chain** (app, bot, optional backend) |
| Subscribing to transactions over WebSocket | **Client** (`xrpl.js` / wallet), not this repo’s WASM |

The vault WASM does **not** send Telegram messages or host HTTP APIs; it **does** enforce who may move funds and to which destinations after a deposit.

---

## Product context (from Petty Ledger product spec)

### What we are building

A **public grievance record** on XRPL: complaints against a person or situation, optional **micro-donations** to causes the accused would dislike, and notifications via Telegram for human-readable “cards.” The **canonical financial path** for stake attached to a named grievance is **through this vault**, which holds XRP until a defined party authorizes a payout.

### Filing types (product / UX)

These describe **user-facing flows**. On-chain, any flow that **locks donation stake** should target the **vault account** with the memo format below; the vault then governs withdrawal.

| Type | Intent (product) |
|------|-------------------|
| **1 — No recipient** | Anonymous grievance; public record only; optional immediate payment to a cause or treasury **without** naming a counterparty (may use a normal `Payment`, not necessarily this vault). |
| **2 — Recipient, no donation** | Named accused; **record + reputation**, no XRP stake (typically memo-only or nominal fee payment — outside vault balance rules). |
| **3 — Recipient, immediate donation** | Named accused; donation intent **without** holding funds until dispute (product may still use direct `Payment` to cause, or deposit then immediate withdraw to donation — product choice). |
| **4 — Recipient, deadline** | Named accused; stake held until **deadline** then donation; **cancellation** if resolved in time. *Time-based auto-release is not implemented in the current WASM* — use off-chain schedulers / future amendments if you need `FinishAfter`-style behavior; **today’s vault** resolves custody via **explicit** `on_withdraw` authorization. |

### Cards (Telegram / confirmation copy)

Product copy for confirmations (implemented off-chain):

- **Card 1** — No recipient: “entered into the permanent public record…”
- **Card 2** — Recipient, no donation: “no financial consequence at this time…”
- **Card 3** — Immediate donation: “a donation … has been made to [cause] on your behalf…”
- **Card 4a / 4b / 4c** — Deadline warning, resolution, failure after deadline — aligned with Type 4 narrative; **resolution that returns stake to the filer** must be reflected in a **withdrawal** the vault allows (see rules below).

---

## On-chain protocol (this repository)

### Deposit — `on_deposit`

A **filer** sends **XRP** into the **vault account** with a memo:

1. A line exactly: `PETTY_LEDGER_V1`
2. A line: `subject:` + **40 hex characters** (20-byte AccountID of the accused / counterparty — the only address that may later authorize withdrawals).
3. A line: `donation:` + **40 hex characters** (AccountID of the cause wallet if funds are forfeited there).

Additional grievance text may follow; the contract validates the header and the two hex lines.

The transaction **`Account`** is stored as the **filer**. The contract rejects a second open stake while one is already **OPEN** for this vault instance.

### Withdraw — `on_withdraw`

Only the **subject** (the `subject:` AccountID from the deposit memo) may sign the withdrawal transaction.

**`Destination`** must be exactly one of:

- **Filer** — return stake to the filer (e.g. “matter resolved,” card 4b-style outcome on the product side).
- **Subject** — pay the escrow to the subject (e.g. vindication / product-defined fairness).
- **Donation** — forfeit stake to the disliked cause (card 3 / 4c-style outcome on the product side).

After a successful withdrawal, vault state is cleared so a new grievance cycle can deposit again.

---

## Memo example (UTF-8 inside `MemoData`)

```
PETTY_LEDGER_V1

subject:00112233445566778899AABBCCDDEEFF00112233
donation:AABBCCDDEEFF00112233445566778899AABBCCDD

Cause: Example cause label
Grievance text…
```

Hex values are **raw AccountID** encodings (40 hex chars). Convert XRPL classic addresses to 20-byte AccountID hex in your frontend or tooling.

---

## Build & deploy (Bedrock)

Prerequisites: Rust target for WASM, `bedrock` CLI, network access for deploy.

```bash
# Build vault WASM (output path matches bedrock.toml [vaults.main].output)
cargo build --target wasm32-unknown-unknown --release -p freelance-agreement-factory-vault

# Or via Bedrock when configured
bedrock build --type vault
```

Deploy and wallet commands depend on your Bedrock version; see `bedrock.toml` for networks (`local`, `alphanet`; testnet faucet URL for test XRP).

```text
[networks.testnet]
url = 'wss://s.altnet.rippletest.net:51233/'
faucet_url = 'https://faucet.altnet.rippletest.net/accounts'
```

Example patterns (adjust flags to your CLI):

```bash
bedrock vault deploy --wallet <seed> --network local
```

---

## Repository layout

| Path | Purpose |
|------|---------|
| `vault/src/lib.rs` | **Petty Ledger** vault — `on_deposit` / `on_withdraw` |
| `escrow/` | Separate smart escrow sample (not the Petty Ledger money path unless you wire it) |
| `bedrock.toml` | Bedrock project: vault + escrow artifacts, networks |
| `.wallets/` | Local keystore (git-ignored) |

---

## Relationship to “native escrow only” writeups

Some earlier notes described **Type 4** using only **`EscrowCreate` / `EscrowCancel` / `EscrowFinish`** with no WASM. **This project adopts the smart vault instead** as the single on-chain authority for **grievance-linked stake**: recording via memo, holding XRP, and withdrawals. You can still use **native escrows** elsewhere for prototypes, but **Petty Ledger stake and release rules** for this codebase are defined by **`vault/src/lib.rs`**.

---

## Environment & integrations (off-chain)

Typical hackathon stack (not enforced by the WASM):

- **XRPL WebSocket** — `wss://s.altnet.rippletest.net:51233` on testnet; client submits `Payment` to vault address.
- **Telegram** — bot token, optional channel for public posts; magic links for “resolve” are **off-chain** unless you add another on-chain mechanism.
- **Cause wallets** — one XRPL address per cause; the **donation:** line in the memo must match the cause account you intend for forfeits.

---

## Security notes

- Anyone can read memos on-chain; do not put secrets in memos.
- The **subject** has sole on-chain authorization to release funds to filer, self, or donation — design product copy and legal expectations accordingly.
- Test on **testnet** before mainnet; review Bedrock / rippled version notes for smart vault availability.
