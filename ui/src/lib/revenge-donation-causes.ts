/** Symbolic “revenge donation” labels — flat list (presentation-only). */

export type RevengeDonationCause = {
  id: string;
  /** Full display line including trailing emoji(s). */
  label: string;
  /** Shown under the label after selection. */
  quip: string;
};

export const REVENGE_DONATION_SECTION_INTRO = "Symbolic donation";

export const REVENGE_DONATION_CAUSES: RevengeDonationCause[] = [
  {
    id: "flat-earth-society",
    label: "Flat Earth Society 🌍",
    quip: "Globe-industry beef, served flat.",
  },
  {
    id: "museum-bad-art",
    label: "Museum of Bad Art 🎨",
    quip: "Critics called; they’re still on hold.",
  },
  {
    id: "national-mustard-museum",
    label: "National Mustard Museum 🌭",
    quip: "Yellow option locked in. No refunds.",
  },
  {
    id: "country-music-hall",
    label: "Country Music Hall of Fame and Museum 🤠",
    quip: "Three chords and a petty receipt.",
  },
  {
    id: "faculty-astrological-studies",
    label: "The Faculty of Astrological Studies 🔮",
    quip: "Blame Mercury—it's always Mercury.",
  },
  {
    id: "stellar-development-foundation",
    label: "Stellar Development Foundation ⛓️",
    quip: "Cross-chain shade, on-chain proof.",
  },
  {
    id: "buglife",
    label: "Buglife 🐛",
    quip: "Six legs, zero remorse.",
  },
  {
    id: "influencer-marketing-hub",
    label: "Influencer Marketing Hub 📱",
    quip: "Thoughts, prayers, and #sponsored healing.",
  },
  {
    id: "paris-saint-germain",
    label: "Paris Saint-Germain 🥇",
    quip: "Champions League of spite.",
  },
  {
    id: "olympique-marseille",
    label: "Olympique de Marseille ⚽",
    quip: "Derby energy—petty but ceremonial.",
  },
];

const CAUSE_LABEL_BY_ID: Record<string, string> = Object.fromEntries(
  REVENGE_DONATION_CAUSES.map((c) => [c.id, c.label])
);

export function getRevengeDonationCauseLabel(id: string): string | undefined {
  return CAUSE_LABEL_BY_ID[id];
}

export function getRevengeDonationCauseQuip(id: string): string | undefined {
  return REVENGE_DONATION_CAUSES.find((c) => c.id === id)?.quip;
}
