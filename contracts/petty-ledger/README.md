# Petty Ledger — smart contract (`petty_ledger`)

**Hackathon context:** Sunday April 12, 2026 — a grievance ledger on the **XRP Ledger**. People file complaints, optionally attach **XRP** to a “cause” the other party would dislike, and notify participants (e.g. via Telegram) off-chain. **On-chain, Petty Ledger is this WASM contract** (Rust crate **`petty_ledger`**, sources under **`src/`** at the Bedrock project root). It is deployed as an XRPL **smart vault** (Bedrock’s vault primitive): the system of record for **recording** a grievance envelope, **holding** XRP, and **authorizing withdrawals** — not a separate REST layer for money movement.

---

## Role of this smart contract

| Responsibility | Where it lives |
|----------------|----------------|
| Grievance text + metadata in a **standard memo** | XRPL `Payment` to the vault account — memo on deposit |
| **Locking XRP** in escrow-like custody | **Petty Ledger** (`on_deposit`) |
| **Releasing** XRP to filer, subject, or donation address | **Petty Ledger** (`on_withdraw`) |
| Telegram cards, magic links, certificates, public feed UI | **Off-chain** (app, bot, optional backend) |
| Subscribing to transactions over WebSocket | **Client** (`xrpl.js` / wallet), not this repo’s WASM |

The **`petty_ledger`** WASM does **not** send Telegram messages or host HTTP APIs; it **does** enforce who may move funds and to which destinations after a deposit.

---

## Product context (from Petty Ledger product spec)

### What we are building

A **public grievance record** on XRPL: complaints against a person or situation, optional **micro-donations** to causes the accused would dislike, and notifications via Telegram for human-readable “cards.” The **canonical financial path** for stake attached to a named grievance is **through this contract** (vault account running `petty_ledger`), which holds XRP until a defined party authorizes a payout.

### Filing types (product / UX)

These describe **user-facing flows**. On-chain, any flow that **locks donation stake** should target the **Petty Ledger vault account** with the memo format below; the contract then governs withdrawal.

| Type | Intent (product) |
|------|-------------------|
| **1 — No recipient** | Anonymous grievance; public record only; optional immediate payment to a cause or treasury **without** naming a counterparty (may use a normal `Payment`, not necessarily **petty_ledger**). |
| **2 — Recipient, no donation** | Named accused; **record + reputation**, no XRP stake (typically memo-only or nominal fee payment — outside this contract’s balance rules). |
| **3 — Recipient, immediate donation** | Named accused; donation intent **without** holding funds until dispute (product may still use direct `Payment` to cause, or deposit then immediate withdraw to donation — product choice). |
| **4 — Recipient, deadline** | Named accused; stake held until **deadline** then donation; **cancellation** if resolved in time. *Time-based auto-release is not implemented in the current WASM* — use off-chain schedulers / future amendments if you need `FinishAfter`-style behavior; **today’s `petty_ledger`** resolves custody via **explicit** `on_withdraw` authorization. |

### Cards (Telegram / confirmation copy)

Product copy for confirmations (implemented off-chain):

- **Card 1** — No recipient: “entered into the permanent public record…”
- **Card 2** — Recipient, no donation: “no financial consequence at this time…”
- **Card 3** — Immediate donation: “a donation … has been made to [cause] on your behalf…”
- **Card 4a / 4b / 4c** — Deadline warning, resolution, failure after deadline — aligned with Type 4 narrative; **resolution that returns stake to the filer** must be reflected in a **withdrawal** this contract allows (see rules below).

---

## On-chain protocol (this repository)

### Deposit — `on_deposit`

A **filer** sends **XRP** into the **vault account** with a memo:

1. A line exactly: `PETTY_LEDGER_V1`
2. A line: `subject:` + **40 hex characters** (20-byte AccountID of the accused / counterparty — the only address that may later authorize withdrawals).
3. A line: `donation:` + **40 hex characters** (AccountID of the cause wallet if funds are forfeited there).

Additional grievance text may follow; the contract validates the header and the two hex lines.

The transaction **`Account`** is stored as the **filer**. The contract rejects a second open stake while one is already **OPEN** for this vault deployment.

### Withdraw — `on_withdraw`

Only the **subject** (the `subject:` AccountID from the deposit memo) may sign the withdrawal transaction.

**`Destination`** must be exactly one of:

- **Filer** — return stake to the filer (e.g. “matter resolved,” card 4b-style outcome on the product side).
- **Subject** — pay the escrow to the subject (e.g. vindication / product-defined fairness).
- **Donation** — forfeit stake to the disliked cause (card 3 / 4c-style outcome on the product side).

After a successful withdrawal, on-chain state is cleared so a new grievance cycle can deposit again.

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

## Build (Rust)

From the Bedrock project root (`contracts/petty-ledger/`):

1. Install the XRPL vault WASM target once per Rust toolchain:

   ```bash
   rustup target add wasm32v1-none
   ```

2. Build the `petty_ledger` crate. The repo root is a **Cargo workspace**; the crate lives under **`vault/`** (with `[lib] path = "../src/lib.rs"`) because **`bedrock vault deploy` expects `vault/Cargo.toml`**. Source code remains **`src/lib.rs`**. Cargo’s **`target-dir`** is set to **`vault/target`** (see **`.cargo/config.toml`**) so artifacts match **`bedrock vault deploy`**, which looks for **`vault/target/wasm32v1-none/release/`** (see `[vaults.main].output` in `bedrock.toml`).

   ```bash
   cd contracts/petty-ledger
   cargo build --target wasm32v1-none --release -p petty_ledger
   ```

   Equivalent explicit package flag (same result):

   ```bash
   cargo build --manifest-path Cargo.toml --target wasm32v1-none --release -p petty_ledger
   ```

You can also build via Bedrock (uses the vault primitive under the hood):

```bash
cd contracts/petty-ledger
bedrock build --type vault
```

---

## Deploy on your machine (local Bedrock network)

**Vault deployments** only support **`local`** or **`alphanet`** (see comment in `bedrock.toml`). Public **testnet** in that file is for clients/faucet-style tooling, not for this vault deploy path.

### 1. Prerequisites

- **Docker** — the local node is started as a container (image is set under `[local_node]` in `bedrock.toml`).
- **[Bedrock CLI](https://github.com/xrpl-commons/bedrock)** — install the version you use for XRPL smart contracts.
- **Rust** — already used for the build step above.

### 2. Start the local XRPL node

In a terminal, from `contracts/petty-ledger` (so Bedrock picks up this `bedrock.toml`):

```bash
cd contracts/petty-ledger
bedrock node start
```

Check that it is running:

```bash
bedrock node status
```

This project’s **`[networks.local]`** expects:

- WebSocket: `ws://localhost:6006`
- Faucet: `http://localhost:8080/faucet`

(If your Bedrock version prints different ports, align `bedrock.toml` or your CLI config with what the node exposes.)

### 3. Fund a wallet

Use a funded account on `local` (for example Bedrock’s faucet against the local node):

```bash
bedrock faucet --network local
# or: bedrock faucet --wallet sXXXXXXXXXXXXXXXXXXXXXXXXXXXXX --network local
```

### 4. Deploy the vault contract

Build first (or rely on Bedrock to build if your CLI supports it), then deploy the **vault** WASM:

```bash
cd contracts/petty-ledger
cargo build --target wasm32v1-none --release
bedrock vault deploy --wallet <your-secret-seed> --network local
```

Replace `<your-secret-seed>` with a funded wallet seed (never commit seeds; use env vars or Bedrock’s wallet tooling in real setups).

Bedrock prints the **vault account address** for the deployed contract — use that address in the UI and in `Payment` memos to this vault.

If a command is not found, run `bedrock vault --help` or `bedrock --help`; flag names can differ slightly between Bedrock versions.

### 5. Stop the local node when finished

```bash
bedrock node stop
```

### Local node troubleshooting

**`permission denied` opening `.bedrock/ledger-daemon.log`**

Bedrock must create and write log files under `contracts/petty-ledger/.bedrock/`. That fails if `.bedrock` (or files inside it) are owned by **root** — common if you ever ran **`sudo bedrock node start`**. The ledger daemon then cannot start, ledgers may not advance, and **`bedrock node status`** can report **not running** even though the CLI printed “started successfully.”

Fix from `contracts/petty-ledger` (use your normal user for all `bedrock` commands):

```bash
bedrock node stop
sudo chown -R "$(whoami):$(whoami)" .bedrock
chmod u+rwx .bedrock
# optional: remove a stale log file if it stayed root-owned
rm -f .bedrock/ledger-daemon.log
bedrock node start
bedrock node status
```

Do **not** use `sudo` for `bedrock node start` after fixing ownership.

**Timeout: “waiting for node to be ready”**

Bedrock waits until it can talk to the node over **WebSocket** (`ws://localhost:6006`). The first start can exceed that wait while Docker pulls **`[local_node].docker_image`** and while **rippled** finishes booting inside the container. You may still see “started successfully” with a warning, then **`bedrock node status`** reports **not running** if the readiness check failed or the container is not actually healthy.

**`bedrock node start` looks OK but `bedrock node status` says not running**

1. **Wait, then re-check** — rippled can need **15–60 seconds** after the container starts before port 6006 accepts connections:
   ```bash
   sleep 30 && bedrock node status
   ```
2. **Inspect Docker** (Bedrock’s own `bedrock node logs` may be a stub; use Docker directly):
   ```bash
   docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'bedrock|xrpl|rippled|NAME'
   docker logs bedrock-xrpl-node --tail 120
   ```
   If the container name differs, use the name from `docker ps -a`.
3. **If the container is `Exited`** — read the end of `docker logs …` for errors (OOM, bad config, image arch mismatch). Fix the error, then `bedrock node stop` and `bedrock node start` again.
4. **If the container is `Up`** but status still fails — confirm nothing else is binding **6006** or **5005** (`ss -tlnp | grep -E '6006|5005'`), then test RPC:
   ```bash
   curl -sS -X POST http://localhost:5005 -d '{"method":"server_info","params":[{}]}' -H 'Content-Type: application/json' | head -c 400
   ```
   A JSON `result` with server info means the node is usable even if Bedrock’s status command is flaky.
5. Ensure **Docker Desktop / dockerd** is running and your user can use Docker **without sudo** (group `docker`), so Bedrock and the CLI agree on which containers exist.

**Docker: `Exited (139)`, `Failed to read … rippled.cfg … Permission denied`, `Missing [node_db] entry`**

`docker logs bedrock-xrpl-node` may show rippled failing to read **`/etc/rippled/rippled.cfg`** (that path is usually a **bind mount** from **`[local_node].config_dir`** → `.bedrock/node-config` in this repo). Errno **13** is **EACCES** (permission denied). The **`[node_db]`** error is a side effect: rippled never loaded a valid config.

On **Fedora / RHEL** with **SELinux enforcing**, bind-mounted project files often get the wrong security context, so the process inside the container cannot read them. Fix labels and permissions, remove the dead container, then start again:

```bash
cd contracts/petty-ledger
bedrock node stop
docker rm -f bedrock-xrpl-node 2>/dev/null || true

sudo chown -R "$(whoami):$(whoami)" .bedrock
chmod u+rwx .bedrock
# Ensure config tree is world-readable so the container user can read the mount
chmod -R a+rX .bedrock/node-config 2>/dev/null || true

# SELinux: allow container to read the bind-mounted config (Fedora / RHEL)
if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce 2>/dev/null)" = "Enforcing" ]; then
  sudo chcon -Rt container_file_t .bedrock/node-config
fi

bedrock node start
sleep 20
docker ps -a --format 'table {{.Names}}\t{{.Status}}' | grep bedrock
docker logs bedrock-xrpl-node --tail 30
```

To **confirm** SELinux was the cause, you can temporarily run **`sudo setenforce 0`**, retry `bedrock node start`, then **`sudo setenforce 1`** and apply **`chcon`** as above so enforcing mode still works.

If **`node-config` looks corrupt** (empty or half-written), stop the node, back up if needed, remove only that folder so Bedrock can regenerate it, fix ownership/SELinux again, then `bedrock node start`:

```bash
bedrock node stop
docker rm -f bedrock-xrpl-node 2>/dev/null || true
rm -rf .bedrock/node-config
# then chown / chcon on .bedrock as above before starting again
```

**Docker: `Is a directory` / `basic_filebuf::underflow error reading the file: Is a directory`**

Rippled loads **`/etc/rippled/rippled.cfg`** inside the container; that must be a **regular file**. If `docker logs` shows **`Is a directory`**, the host path **` .bedrock/node-config/rippled.cfg`** is a **directory** (mis-created) instead of a config **file** — nothing will listen on **5005** / **6006** until this is fixed.

Check and fix from `contracts/petty-ledger`:

```bash
ls -la .bedrock/node-config/
# If you see rippled.cfg as a directory (wrong):
bedrock node stop
docker rm -f bedrock-xrpl-node 2>/dev/null || true
rm -rf .bedrock/node-config
# Regenerate: Bedrock recreates node-config on the next start
sudo chown -R "$(whoami):$(whoami)" .bedrock
chmod -R a+rX .bedrock/node-config 2>/dev/null || true
# Fedora SELinux: see the chcon block above
bedrock node start
```

After a clean start, confirm with `docker ps` (container **Up**) and `curl` to **`http://localhost:5005`** with **`server_info`**.

---

### Other networks (alphanet)

For shared test infrastructure instead of Docker on localhost, deploy with `--network alphanet` and the same `bedrock vault deploy` pattern once your wallet is funded on that network. **Testnet** (`wss://s.altnet.rippletest.net`) is not listed as supported for vault deploy in this project’s `bedrock.toml` comment—use **local** or **alphanet** for vault deployment.

---

## Repository layout

| Path | Purpose |
|------|---------|
| `Cargo.toml` | Workspace manifest (`vault` + `escrow` members) |
| `.cargo/config.toml` | Sets **`build.target-dir = "vault/target"`** so Bedrock finds WASM under **`vault/target/...`** |
| `src/lib.rs` | **Petty Ledger** — `on_deposit` / `on_withdraw` (built via `vault/Cargo.toml`) |
| `vault/Cargo.toml` | **`petty_ledger`** package stub pointing at `../src/lib.rs` — required for **`bedrock vault deploy`** (it looks for `vault/Cargo.toml`) |
| `escrow/` | Sample smart escrow (`petty_ledger_escrow`), optional |
| `bedrock.toml` | Bedrock project name **`petty-ledger`**, vault + escrow artifacts, networks |
| `.wallets/` | Local keystore (git-ignored) |

---

## Relationship to “native escrow only” writeups

Some earlier notes described **Type 4** using only **`EscrowCreate` / `EscrowCancel` / `EscrowFinish`** with no WASM. **This project adopts the `petty_ledger` smart vault instead** as the single on-chain authority for **grievance-linked stake**: recording via memo, holding XRP, and withdrawals. You can still use **native escrows** elsewhere for prototypes, but **Petty Ledger stake and release rules** for this codebase are defined by **`src/lib.rs`**.

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
