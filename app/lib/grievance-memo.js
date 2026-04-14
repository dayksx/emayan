/** XRPL memos are hex on the wire; we store human-readable UTF-8 text. */
export const MAX_MEMO_UTF8_BYTES = 3800;

/** UI label for the filing path that stores a correction deadline on-chain (see `correctionUntilIso`). */
export const CORRECTION_WINDOW_POLICY_LABEL = "Give them a chance to correct it";

export const CAUSES = [
  { value: "unpaid_work", label: "Unpaid work, invoice, or deliverables" },
  { value: "broken_deadline", label: "Missed deadline / vanished before delivery" },
  { value: "contract_breach", label: "Breach of handshake, DM, or verbal treaty" },
  { value: "conduct", label: "Harassment or unacceptable conduct" },
  { value: "ghosting", label: "Ghosting after “sounds good” (meal, trip, or life)" },
  { value: "slow_replies", label: "Left on read for geologic time" },
  { value: "bill_split", label: "Venmo / split-the-bill crimes" },
  { value: "borrowed_stuff", label: "Borrowed my thing — Earth is now its home" },
  { value: "late_habitual", label: "Chronic lateness (their clock runs on myth)" },
  { value: "spoiler", label: "Spoiled a show, book, or match on purpose" },
  { value: "music_treason", label: "Music taste betrayal (playlist war crime)" },
  { value: "sports_fandom", label: "Sports / fandom treason" },
  { value: "roommate_domestic", label: "Roommate domestic policy violation" },
  { value: "food_order", label: "Ate my labeled food / finished the snacks" },
  { value: "coffee_round", label: "Skipped their round (coffee, drinks, karma)" },
  { value: "group_chat", label: "Group chat chaos / wrong-thread energy" },
  { value: "meme_theft", label: "Stole my joke, meme, or bit" },
  { value: "plan_cancel", label: "Canceled plans — weather in their head only" },
  { value: "double_book", label: "Double-booked me for a “maybe”" },
  { value: "advice_ignored", label: "Asked for advice, ignored it, blamed physics" },
  { value: "wifi_password", label: "Did not share Wi‑Fi / hotspot in hour of need" },
  { value: "queue_parking", label: "Queue-cutting, seat-saving, or parking lore" },
  { value: "game_throw", label: "Threw the game — ranked or friendship" },
  { value: "fitness_sabotage", label: "Skipped leg day / dragged me to brunch instead" },
  { value: "pet_offense", label: "Insulted the pet (or its Instagram)" },
  { value: "aesthetic_crime", label: "Aesthetic crime (carpet, font, or vibes)" },
  { value: "other", label: "Other — the law has not caught up yet" },
];

export function truncateUtf8Bytes(str, maxBytes) {
  const enc = new TextEncoder();
  if (enc.encode(str).length <= maxBytes) return str;
  let end = str.length;
  while (end > 0 && enc.encode(str.slice(0, end)).length > maxBytes) end -= 1;
  return `${str.slice(0, end)} …(truncated)`;
}

/**
 * Single-line memo for explorers:
 * Petty Ledger - Cause: <grievance> - Amount: x XRP - From: … - To: … [ - Correction until: ISO8601 ]
 * Whitespace in the grievance is collapsed to one line so " - " separators stay readable.
 * @param {{ filer: string, to: string, amountXrp: string, grievanceBody: string, correctionUntilIso?: string }} p
 */
export function buildGrievanceMemoText({ filer, to, amountXrp, grievanceBody, correctionUntilIso }) {
  const causeText = grievanceBody.trim().replace(/\s+/g, " ");
  let line = `Petty Ledger - Cause: ${causeText} - Amount: ${amountXrp} XRP - From: ${filer} - To: ${to}`;
  if (correctionUntilIso && String(correctionUntilIso).trim()) {
    line += ` - Correction until: ${String(correctionUntilIso).trim()}`;
  }

  return truncateUtf8Bytes(line, MAX_MEMO_UTF8_BYTES);
}

const XRPL_CLASSIC_RE = "r[1-9A-HJ-NP-Za-km-z]{25,34}";
const TX_HASH_RE = "[A-Fa-f0-9]{64}";

/**
 * Parse a Petty Ledger grievance memo line (same shape as buildGrievanceMemoText).
 * @returns {{ cause: string, amountXrp: string, from: string, to: string, correctionUntilIso: string | null } | null}
 */
export function parsePettyLedgerGrievanceMemo(text) {
  if (!text || typeof text !== "string") return null;
  let s = text.trim();
  const correctionMarker = " - Correction until: ";
  let correctionUntilIso = null;
  const cidx = s.lastIndexOf(correctionMarker);
  if (cidx !== -1) {
    correctionUntilIso = s.slice(cidx + correctionMarker.length).trim() || null;
    s = s.slice(0, cidx);
  }

  const causePrefix = "Petty Ledger - Cause: ";
  const amountSep = " - Amount: ";
  if (!s.startsWith(causePrefix)) return null;
  const amountIdx = s.indexOf(amountSep, causePrefix.length);
  if (amountIdx === -1) return null;
  const cause = s.slice(causePrefix.length, amountIdx);
  const tail = s.slice(amountIdx + amountSep.length);
  const re = new RegExp(
    `^([\\d.]+) XRP - From: (${XRPL_CLASSIC_RE}) - To: (${XRPL_CLASSIC_RE})$`
  );
  const m = re.exec(tail);
  if (!m) return null;
  return { cause, amountXrp: m[1], from: m[2], to: m[3], correctionUntilIso };
}

/**
 * Whether the filer may record an on-chain resolution (amicable) for this memo.
 * @param {{ correctionUntilIso?: string | null }} parsed
 * @returns {{ state: 'allowed', until: Date } | { state: 'no_window' } | { state: 'too_late', until: Date } | { state: 'invalid_date' }}
 */
export function getGrievanceResolutionEligibility(parsed, now = new Date()) {
  if (!parsed) return { state: "no_window" };
  const iso = parsed.correctionUntilIso;
  if (!iso || !String(iso).trim()) return { state: "no_window" };
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return { state: "invalid_date" };
  if (now.getTime() <= end.getTime()) return { state: "allowed", until: end };
  return { state: "too_late", until: end };
}

/**
 * Memo for a 1-drop follow-up tx signed by the filer to mark a grievance resolved on-chain.
 */
export function buildGrievanceResolutionMemoText({ originalTxHash, filer, originalRecipient }) {
  const line = `Petty Ledger - RESOLVED - Cancels tx: ${originalTxHash} - Filer: ${filer} - Original to: ${originalRecipient}`;
  return truncateUtf8Bytes(line, MAX_MEMO_UTF8_BYTES);
}

/**
 * @returns {{ canceledTxHash: string, filer: string, originalTo: string } | null}
 */
export function parsePettyLedgerResolutionMemo(text) {
  if (!text || typeof text !== "string") return null;
  const s = text.trim();
  const prefix = "Petty Ledger - RESOLVED - Cancels tx: ";
  if (!s.startsWith(prefix)) return null;
  const rest = s.slice(prefix.length);
  const re = new RegExp(
    `^(${TX_HASH_RE}) - Filer: (${XRPL_CLASSIC_RE}) - Original to: (${XRPL_CLASSIC_RE})$`
  );
  const m = re.exec(rest);
  if (!m) return null;
  return { canceledTxHash: m[1], filer: m[2], originalTo: m[3] };
}
