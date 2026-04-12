# XRPL contracts (Petty Ledger)

The Bedrock project for **Petty Ledger** lives in **`petty-ledger/`** (`bedrock.toml`, `src/lib.rs` = crate `petty_ledger`, plus sample `escrow/`). For **`cargo build --target wasm32v1-none --release`**, starting **`bedrock node start`**, and **local vault deploy**, see [`petty-ledger/README.md`](petty-ledger/README.md).

The vault crate lives at the project root as `src/lib.rs`, not under a nested `petty-ledger/` folder inside the Bedrock project.
