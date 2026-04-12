const TELEGRAM_MAX = 4096;

/** Default first line label for grievance Telegram DMs. */
export const PETTY_LEDGER_NOTIFICATION_TITLE = "Petty Ledger Notification 🙂";

/**
 * Pretty plain-text body for Telegram (emojis + spacing). No parse_mode — safe for any user text.
 * @param {{
 *   brandLine?: string;
 *   filer: string;
 *   recipient: string;
 *   cause: string;
 *   amountXrp: string;
 *   grievanceBody: string;
 *   txHash: string;
 * }} p
 */
export function buildGrievanceTelegramText(p) {
  const brandLine = p.brandLine ?? PETTY_LEDGER_NOTIFICATION_TITLE;
  const msg = p.grievanceBody.trim().slice(0, 1500);
  const lines = [
    `✨ ${brandLine}`,
    `📋 New grievance`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `🌐 XRPL testnet`,
    ``,
    `👤 Filer`,
    `   ${p.filer}`,
    ``,
    `📬 Recipient`,
    `   ${p.recipient}`,
    ``,
    `🏷 Cause`,
    `   ${p.cause}`,
    ``,
    `💰 Amount`,
    `   ${p.amountXrp} XRP`,
    ``,
    `💬 Grievance`,
    `────────────`,
    msg,
    `────────────`,
    ``,
    `🔗 Transaction`,
    `   ${p.txHash}`,
    ``,
  ];

  let text = lines.join("\n");
  if (text.length > TELEGRAM_MAX) {
    text = text.slice(0, TELEGRAM_MAX - 1) + "…";
  }
  return text;
}
