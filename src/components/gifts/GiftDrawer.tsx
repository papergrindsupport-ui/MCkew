// Reusable gift drawer. Opens from the leaderboard popover, public
// profile page, and the dashboard quick-send shortcut.
//
// Props: recipient (publicId + display info), open/onOpenChange, onSent?.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuX, LuPencil, LuGift } from "react-icons/lu";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useApi } from "@/integrations/account/useApi";
import { GIFT_CATALOG, type GiftId } from "@/data/GiftCatalog";

export type GiftRecipient = {
  publicId: string;
  username: string | null;
  displayName: string | null;
  imageUrl: string | null;
};

const TONE_BG: Record<string, string> = {
  pink: "bg-card-pink",
  amber: "bg-card-yellow",
  purple: "bg-card-purple",
  blue: "bg-card-blue",
  yellow: "bg-card-yellow",
};

export function GiftDrawer({
  open,
  onOpenChange,
  recipient,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: GiftRecipient | null;
  onSent?: (info: { giftId: GiftId; amount: number }) => void;
}) {
  const api = useApi();
  const [selected, setSelected] = useState<GiftId>("rose");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  function close() {
    if (sending) return;
    onOpenChange(false);
  }

  async function send() {
    if (!recipient) return;
    setSending(true);
    try {
      const r = await api.sendGift({
        recipient_public_id: recipient.publicId,
        gift_id: selected,
        note: note.trim() || null,
      });
      const giftDef = GIFT_CATALOG.find((g) => g.id === selected)!;
      toast.success(
        `${giftDef.emoji} Sent a ${giftDef.label} to @${recipient.username ?? "user"}!`,
      );
      onSent?.({ giftId: selected, amount: r.amount });
      onOpenChange(false);
      setNote("");
      setSelected("rose");
    } catch (e: any) {
      const msg: string = e?.error || "Could not send gift";
      if (e?.status === 402 || /insufficient/i.test(msg)) {
        toast.error("Not enough pencils.");
      } else if (e?.status === 401) {
        toast.error("Sign in to send gifts.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSending(false);
    }
  }

  const selectedDef = GIFT_CATALOG.find((g) => g.id === selected)!;
  const avatar =
    recipient?.imageUrl ||
    `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(
      recipient?.username || recipient?.publicId || "anon",
    )}`;

  return (
    <AnimatePresence>
      {open && recipient && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Send a gift to ${recipient.displayName ?? recipient.username}`}
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] w-[min(95vw,460px)] rounded-3xl border-2 border-border bg-card shadow-2xl overflow-hidden"
          >
            <div className="relative p-5 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border-b-2 border-border">
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
              >
                <LuX size={16} />
              </button>
              <div className="flex items-center gap-3">
                <img
                  src={avatar}
                  alt=""
                  className="w-12 h-12 rounded-2xl border-2 border-border object-cover bg-muted"
                />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary inline-flex items-center gap-1">
                    <LuGift size={11} /> Send a gift
                  </div>
                  <div className="font-extrabold text-foreground truncate">
                    {recipient.displayName || recipient.username || "Anonymous"}
                  </div>
                  {recipient.username && (
                    <div className="text-xs text-muted-foreground truncate">
                      @{recipient.username}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {GIFT_CATALOG.map((g) => {
                  const active = g.id === selected;
                  return (
                    <motion.button
                      key={g.id}
                      type="button"
                      onClick={() => setSelected(g.id)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "relative rounded-2xl border-2 p-2.5 flex flex-col items-center gap-1 transition-colors",
                        TONE_BG[g.tone] ?? "bg-card",
                        active
                          ? "border-primary ring-2 ring-primary/40 shadow-md"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <span className="text-2xl leading-none">{g.emoji}</span>
                      <span className="text-[11px] font-bold text-foreground leading-tight">
                        {g.label}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary">
                        <LuPencil size={9} />
                        {g.amount}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="rounded-2xl border-2 border-border bg-muted/30 p-3 flex items-center gap-3">
                <div className="text-3xl">{selectedDef.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm">{selectedDef.label}</div>
                  <div className="text-xs text-muted-foreground">{selectedDef.blurb}</div>
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-extrabold">
                  <LuPencil size={11} />
                  {selectedDef.amount}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 400))}
                  placeholder="Say something nice…"
                  rows={2}
                  className="mt-1 w-full rounded-xl border-2 border-border bg-background p-3 text-sm focus:border-primary focus:outline-none resize-none"
                />
                <div className="mt-1 text-right text-[10px] text-muted-foreground">
                  {note.length}/400
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={close}
                  disabled={sending}
                  className="flex-1 h-11 rounded-xl border-2 border-border bg-card hover:bg-muted text-sm font-bold transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={sending}
                  className="flex-[2] h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-extrabold inline-flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {sending ? (
                    "Sending…"
                  ) : (
                    <>
                      Send {selectedDef.label} <LuPencil size={12} /> {selectedDef.amount}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default GiftDrawer;
