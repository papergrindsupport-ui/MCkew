// Fixed catalog of gifts users can send each other.
// Server-side route validates against this same shape (id + amount).
// To honor the existing `gifts` table (which only stores `amount` + `message`),
// we encode the chosen gift id at the start of the `message` column as
// `[gift:<id>]` followed by an optional newline + note. Decoders below.

export type GiftId = "rose" | "coffee" | "box" | "gem" | "trophy";

export interface GiftDef {
  id: GiftId;
  label: string;
  emoji: string;
  amount: number;
  blurb: string;
  /** tailwind tone for the card */
  tone: "pink" | "amber" | "purple" | "blue" | "yellow";
}

export const GIFT_CATALOG: GiftDef[] = [
  { id: "rose", label: "Rose", emoji: "🌹", amount: 5, blurb: "A small thank-you.", tone: "pink" },
  {
    id: "coffee",
    label: "Coffee",
    emoji: "☕",
    amount: 20,
    blurb: "Fuel their study session.",
    tone: "amber",
  },
  {
    id: "box",
    label: "Gift box",
    emoji: "🎁",
    amount: 100,
    blurb: "A real thoughtful gesture.",
    tone: "purple",
  },
  {
    id: "gem",
    label: "Gem",
    emoji: "💎",
    amount: 500,
    blurb: "Premium appreciation.",
    tone: "blue",
  },
  {
    id: "trophy",
    label: "Trophy",
    emoji: "🏆",
    amount: 1000,
    blurb: "Top-shelf flex.",
    tone: "yellow",
  },
];

export const GIFT_BY_ID: Record<GiftId, GiftDef> = Object.fromEntries(
  GIFT_CATALOG.map((g) => [g.id, g]),
) as Record<GiftId, GiftDef>;

const PREFIX_RE = /^\[gift:([a-z]+)\]\s*\n?/i;

export function encodeGiftMessage(giftId: GiftId, note?: string | null): string {
  const trimmed = (note ?? "").trim();
  return trimmed ? `[gift:${giftId}]\n${trimmed}` : `[gift:${giftId}]`;
}

export function decodeGiftMessage(raw: string | null | undefined): {
  gift: GiftDef | null;
  note: string;
} {
  if (!raw) return { gift: null, note: "" };
  const m = raw.match(PREFIX_RE);
  if (!m) return { gift: null, note: raw };
  const gift = GIFT_BY_ID[(m[1] as GiftId) ?? ""] ?? null;
  return { gift, note: raw.slice(m[0].length) };
}
