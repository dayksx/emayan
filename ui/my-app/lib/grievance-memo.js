/** XRPL memos are hex on the wire; we store human-readable UTF-8 text. */
export const MAX_MEMO_UTF8_BYTES = 3800;

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
 * Petty Ledger - Cause: <grievance> - Amount: x XRP - From: … - To: …
 * Whitespace in the grievance is collapsed to one line so " - " separators stay readable.
 */
export function buildGrievanceMemoText({ filer, to, amountXrp, grievanceBody }) {
  const causeText = grievanceBody.trim().replace(/\s+/g, " ");
  const line = `Petty Ledger - Cause: ${causeText} - Amount: ${amountXrp} XRP - From: ${filer} - To: ${to}`;

  return truncateUtf8Bytes(line, MAX_MEMO_UTF8_BYTES);
}
