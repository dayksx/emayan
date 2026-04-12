import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Repo root `README.md` (two levels up from `src/`). Override with `PETTY_LEDGER_README_PATH`. */
export function resolveReadmePath(): string {
  const fromEnv = process.env.PETTY_LEDGER_README_PATH?.trim();
  if (fromEnv) return fromEnv;
  return join(__dirname, "..", "..", "README.md");
}

export function loadPettyLedgerReadme(): string {
  const path = resolveReadmePath();
  if (!existsSync(path)) {
    console.error(`❌ README not found at ${path}`);
    throw new Error(
      `Petty Ledger README not found at ${path}. Set PETTY_LEDGER_README_PATH or run from the repo with README.md at the repository root.`
    );
  }
  const text = readFileSync(path, "utf-8");
  console.log(
    `📖 Loaded Petty Ledger README (${text.length.toLocaleString()} chars) — ${path}`
  );
  return text;
}
