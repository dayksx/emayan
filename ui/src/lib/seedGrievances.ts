export interface Grievance {
  id: number;
  text: string;
  cause: string;
  /** Symbolic donation recipient (on-chain memo “Association” line); defaults to `cause` in the UI when omitted. */
  association?: string;
  amount: string;
  time: string;
  status?: "PENDING" | "RESOLVED" | "EXECUTED";
}

const seedGrievancesBase: Omit<Grievance, "association">[] = [
  {
    id: 1,
    text: "For ignoring a voice note and continuing to text as if nothing happened.",
    cause: "Influencer Marketing Hub 📱",
    amount: "0.50 RLUSD",
    time: "2 min ago",
  },
  {
    id: 2,
    text: "For pronouncing \"quinoa\" as \"kwin-OH-ah\" despite correction.",
    cause: "The Faculty of Astrological Studies 🔮",
    amount: "1.00 RLUSD",
    time: "7 min ago",
  },
  {
    id: 3,
    text: "For parking too far left, every day, for three years.",
    cause: "Stellar Development Foundation ⛓️",
    amount: "2.00 RLUSD",
    time: "12 min ago",
  },
  {
    id: 4,
    text: "For not breaking up after the fifth red flag.",
    cause: "Museum of Bad Art 🎨",
    amount: "0.50 RLUSD",
    time: "18 min ago",
  },
  {
    id: 5,
    text: "For saying \"you've got to see this film,\" and it's the one I suggested to you six months ago.",
    cause: "Country Music Hall of Fame and Museum 🤠",
    amount: "0.50 RLUSD",
    time: "24 min ago",
  },
  {
    id: 6,
    text: "For setting the alarm 30 minutes early so you can press snooze three times.",
    cause: "National Mustard Museum 🌭",
    amount: "0.50 RLUSD",
    time: "31 min ago",
  },
  {
    id: 7,
    text: "For taking calls on speaker in the open-plan office.",
    cause: "Buglife 🐛",
    amount: "1.00 RLUSD",
    time: "45 min ago",
  },
  {
    id: 8,
    text: "For claiming to be 'five minutes away' at 8:47pm, then arriving at 9:34pm.",
    cause: "Paris Saint-Germain 🥇",
    amount: "2.00 RLUSD",
    time: "1 hr ago",
  },
  {
    id: 9,
    text: "For saying the restaurant was 'casual' and showing up in a blazer.",
    cause: "Olympique de Marseille ⚽",
    amount: "0.50 RLUSD",
    time: "1.5 hrs ago",
  },
  {
    id: 10,
    text: "For ordering a salad then eating half my fries 'by accident.'",
    cause: "Flat Earth Society 🌍",
    amount: "1.00 RLUSD",
    time: "2 hrs ago",
  },
];

/** Mock docket rows include `association` (symbolic donation name) for parity with on-chain memos. */
export const seedGrievances: Grievance[] = seedGrievancesBase.map((g) => ({
  ...g,
  association: g.cause,
}));
