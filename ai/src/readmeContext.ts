import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Parent of `src/` or `dist/` — always the `ai/` package directory. */
function getAiPackageRoot(): string {
  return join(__dirname, "..");
}

/**
 * Default paths: repository root `README.md` and `ai/README.md`.
 * Override with `PETTY_LEDGER_README_PATH` (must be a **file** path to the root spec README).
 */
export function resolveRootReadmePath(): string {
  const fromEnv = process.env.PETTY_LEDGER_README_PATH?.trim();
  if (fromEnv) {
    if (existsSync(fromEnv) && statSync(fromEnv).isDirectory()) {
      return join(fromEnv, "README.md");
    }
    return fromEnv;
  }
  return join(getAiPackageRoot(), "..", "README.md");
}

export function resolveAiPackageReadmePath(): string {
  return join(getAiPackageRoot(), "README.md");
}

function readMarkdownFile(label: string, path: string): string | null {
  if (!existsSync(path)) {
    console.warn(`⚠️  ${label} not found — ${path}`);
    return null;
  }
  if (!statSync(path).isFile()) {
    console.error(`❌ ${label} is not a file — ${path}`);
    return null;
  }
  const text = readFileSync(path, "utf-8");
  console.log(
    `📖 Loaded ${label} (${text.length.toLocaleString()} chars) — ${path}`
  );
  return text;
}

/**
 * Loads the **repository** README (full Petty Ledger product spec) and **`ai/README.md`**
 * (agent-specific notes). Concatenates both for the LLM system context.
 */
export function loadAgentReadmes(): string {
  const rootPath = resolveRootReadmePath();
  const aiPath = resolveAiPackageReadmePath();

  const root = readMarkdownFile("root README (project spec)", rootPath);
  const ai = readMarkdownFile("ai/README.md (agent package)", aiPath);

  const sections: string[] = [];

  if (root) {
    sections.push(
      "### Repository README — Petty Ledger / Emayan (full technical spec)\n\n" +
        root
    );
  }
  if (ai) {
    sections.push(
      "### AI package README — Telegram agent (setup & behavior)\n\n" + ai
    );
  }

  if (sections.length === 0) {
    throw new Error(
      "No README content could be loaded. Check paths:\n" +
        `  - ${rootPath}\n` +
        `  - ${aiPath}`
    );
  }

  return sections.join("\n\n---\n\n");
}
