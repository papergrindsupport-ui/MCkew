// Dashboard "Gifts" section: tabs for received/sent gifts.
// Header shows totals and a "Send a gift" quick-action that opens the
// GiftDrawer with a small recipient picker (recent leaderboard names).

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuGift,
  LuPencil,
  LuArrowDownToLine,
  LuArrowUpFromLine,
  LuSend,
  LuSearch,
  LuX,
} from "react-icons/lu";
import { useApi } from "@/integrations/account/useApi";
import { decodeGiftMessage } from "@/data/GiftCatalog";
import { cn } from "@/lib/utils";
import { GiftDrawer, type GiftRecipient } from "@/components/gifts/GiftDrawer";

type Tab = "received" | "sent";

type GiftItem = {
  id: string;
  amount: number;
  message: string | null;
  createdAt: string;
  counterparty: {
    publicId: string;
    username: string | null;
    displayName: string | null;
    imageUrl: string | null;
    accountType: string;
  } | null;
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmt(n: number) {
  return n.toLocaleString("en-US");
}

export function GiftsSection() {
  const api = useApi();
  const [tab, setTab] = useState<Tab>("received");
  const [received, setReceived] = useState<{ items: GiftItem[]; total: number } | null>(null);
  const [sent, setSent] = useState<{ items: GiftItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [drawerRecipient, setDrawerRecipient] = useState<GiftRecipient | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([api.listGifts("received"), api.listGifts("sent")]);
      setReceived({ items: r.data, total: r.totalAmount });
      setSent({ items: s.data, total: s.totalAmount });
    } catch {
      setReceived({ items: [], total: 0 });
      setSent({ items: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = tab === "received" ? received : sent;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest">
            <LuGift /> Gifts
          </div>
          <h2 className="text-2xl font-bold mt-1">Gifts you've exchanged</h2>
          <p className="text-sm text-muted-foreground">
            Send pencils and good vibes to other learners.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-extrabold hover:bg-primary/90 shadow-sm"
        >
          <LuSend size={14} /> Send a gift
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <TotalsCard
          tone="green"
          icon={<LuArrowDownToLine size={16} />}
          label="Received"
          total={received?.total ?? 0}
          count={received?.items.length ?? 0}
          loading={loading}
          active={tab === "received"}
          onClick={() => setTab("received")}
        />
        <TotalsCard
          tone="blue"
          icon={<LuArrowUpFromLine size={16} />}
          label="Sent"
          total={sent?.total ?? 0}
          count={sent?.items.length ?? 0}
          loading={loading}
          active={tab === "sent"}
          onClick={() => setTab("sent")}
        />
      </div>

      <div className="rounded-3xl border-2 border-border bg-card overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b-2 border-border flex items-center gap-2">
          <div className="inline-flex rounded-full border-2 border-border bg-muted p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setTab("received")}
              className={cn(
                "px-3 py-1.5 rounded-full transition",
                tab === "received" ? "bg-card shadow-sm" : "text-muted-foreground",
              )}
            >
              Received
            </button>
            <button
              type="button"
              onClick={() => setTab("sent")}
              className={cn(
                "px-3 py-1.5 rounded-full transition",
                tab === "sent" ? "bg-card shadow-sm" : "text-muted-foreground",
              )}
            >
              Sent
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.ul
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="divide-y divide-border"
          >
            {loading && (
              <li className="p-6 text-center text-sm text-muted-foreground">Loading gifts…</li>
            )}
            {!loading && current && current.items.length === 0 && (
              <li className="p-8 text-center text-sm text-muted-foreground">
                {tab === "received"
                  ? "No gifts received yet. Climb the leaderboard and others will notice!"
                  : "You haven't sent any gifts yet. Spread some pencils 🌹"}
              </li>
            )}
            {!loading && current?.items.map((g) => <GiftRow key={g.id} gift={g} direction={tab} />)}
          </motion.ul>
        </AnimatePresence>
      </div>

      <RecipientPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(r) => {
          setPickerOpen(false);
          setDrawerRecipient(r);
        }}
      />

      <GiftDrawer
        open={Boolean(drawerRecipient)}
        onOpenChange={(o) => !o && setDrawerRecipient(null)}
        recipient={drawerRecipient}
        onSent={() => {
          setDrawerRecipient(null);
          refresh();
        }}
      />
    </section>
  );
}

function TotalsCard({
  tone,
  icon,
  label,
  total,
  count,
  loading,
  active,
  onClick,
}: {
  tone: "green" | "blue";
  icon: React.ReactNode;
  label: string;
  total: number;
  count: number;
  loading: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const bg = tone === "green" ? "bg-card-green" : "bg-card-blue";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left rounded-2xl border-2 p-4 transition-all",
        bg,
        active
          ? "border-primary shadow-md ring-2 ring-primary/30"
          : "border-border hover:border-primary/50",
      )}
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/80">
        {icon} {label}
      </div>
      <div className="mt-2 inline-flex items-baseline gap-1.5">
        <LuPencil size={16} className="text-primary" />
        <span className="text-3xl font-black tabular-nums text-foreground">
          {loading ? "—" : fmt(total)}
        </span>
      </div>
      <div className="mt-0.5 text-xs text-foreground/70">
        {loading ? "…" : `${count} ${count === 1 ? "gift" : "gifts"}`}
      </div>
    </button>
  );
}

function GiftRow({ gift, direction }: { gift: GiftItem; direction: Tab }) {
  const decoded = useMemo(() => decodeGiftMessage(gift.message), [gift.message]);
  const cp = gift.counterparty;
  const handle = cp?.username || cp?.publicId || "anon";
  const isAnon = cp?.accountType !== "clerk";
  const avatar =
    cp?.imageUrl || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(handle)}`;
  const name = isAnon ? "Anonymous" : cp?.displayName || cp?.username || "Anonymous";

  return (
    <li className="px-4 sm:px-5 py-3 flex items-start gap-3">
      <div className="text-3xl leading-none shrink-0 mt-0.5">{decoded.gift?.emoji ?? "🎁"}</div>
      <img
        src={avatar}
        alt=""
        className="w-9 h-9 rounded-full border-2 border-border object-cover bg-muted shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-foreground truncate">
          {direction === "received" ? "From " : "To "}
          {isAnon ? (
            <span>{name}</span>
          ) : (
            <a href={`/profile/${handle}`} className="hover:text-primary">
              {name} <span className="text-muted-foreground font-normal">@{handle}</span>
            </a>
          )}
        </div>
        {decoded.note && (
          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">"{decoded.note}"</div>
        )}
        <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
          {decoded.gift?.label ?? "Gift"} • {fmtDate(gift.createdAt)}
        </div>
      </div>
      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-extrabold text-sm shrink-0">
        <LuPencil size={12} />
        {fmt(gift.amount)}
      </div>
    </li>
  );
}

function RecipientPickerModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (r: GiftRecipient) => void;
}) {
  const api = useApi();
  const [users, setUsers] = useState<
    Array<{
      id: string;
      username: string | null;
      displayName: string | null;
      imageUrl: string | null;
      accountType: string;
      isMe: boolean;
    }>
  >([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .getLeaderboard()
      .then(
        (r) =>
          setUsers(
            (r.data ?? [])
              .filter((u) => u.accountType === "clerk" && !u.isMe)
              .map((u) => ({
                id: u.id,
                username: u.username,
                displayName: u.displayName,
                imageUrl: u.imageUrl,
                accountType: u.accountType,
                isMe: u.isMe,
              })),
          ),
        () => setUsers([]),
      )
      .finally(() => setLoading(false));
  }, [open, api]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users.slice(0, 50);
    return users
      .filter(
        (u) =>
          (u.username ?? "").toLowerCase().includes(term) ||
          (u.displayName ?? "").toLowerCase().includes(term),
      )
      .slice(0, 50);
  }, [users, q]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[78] bg-background/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[79] w-[min(95vw,440px)] rounded-3xl border-2 border-border bg-card shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b-2 border-border flex items-center gap-2">
              <LuSend className="text-primary" size={18} />
              <div className="font-extrabold text-sm">Pick a recipient</div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="ml-auto w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
              >
                <LuX size={16} />
              </button>
            </div>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <LuSearch
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name or @username"
                  className="w-full pl-9 pr-3 py-2 rounded-full border-2 border-border bg-background text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <ul className="max-h-[55vh] overflow-y-auto divide-y divide-border">
              {loading && (
                <li className="p-6 text-center text-sm text-muted-foreground">Loading users…</li>
              )}
              {!loading && filtered.length === 0 && (
                <li className="p-6 text-center text-sm text-muted-foreground">No matches.</li>
              )}
              {filtered.map((u) => {
                const handle = u.username || u.id;
                const avatar =
                  u.imageUrl ||
                  `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(handle)}`;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() =>
                        onPick({
                          publicId: u.id,
                          username: u.username,
                          displayName: u.displayName,
                          imageUrl: u.imageUrl,
                        })
                      }
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-muted text-left"
                    >
                      <img
                        src={avatar}
                        alt=""
                        className="w-9 h-9 rounded-full border-2 border-border object-cover bg-muted"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm truncate">
                          {u.displayName || u.username || "Anonymous"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">@{handle}</div>
                      </div>
                      <LuGift size={16} className="text-primary" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default GiftsSection;
