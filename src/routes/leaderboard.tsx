import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  LuSearch,
  LuTrophy,
  LuPencil,
  LuChevronLeft,
  LuChevronRight,
  LuShieldCheck,
  LuStar,
  LuGift,
  LuUserPlus,
  LuArrowRight,
  LuMedal,
  LuCrown,
  LuX,
  LuSparkles,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import { PencilsExplainer } from "@/components/PencilsExplainer";
import { createApiClient } from "@/lib/apiClient";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — MCkew" },
      { name: "description", content: "See the top learners ranked by pencils earned." },
      { property: "og:title", content: "Leaderboard — MCkew" },
      { property: "og:description", content: "Top learners ranked by pencils earned." },
    ],
  }),
  component: LeaderboardPage,
});

// ───────────────────────── Types ─────────────────────────
type Badge = "EXPERT" | "ADMIN" | "PRO" | "MENTOR" | null;
type User = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  pencils: number;
  badge: Badge;
};

const PER_PAGE = 40;

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

// ───────────────────────── Page ─────────────────────────
function LeaderboardPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [openProfile, setOpenProfile] = useState<string | null>(null);
  const [realUsers, setRealUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real users from the leaderboard API; merge ahead of the dummy seed
  // so the page is always populated even before any signups.
  useEffect(() => {
    const api = createApiClient();
    api
      .getLeaderboard()
      .then(
        (r) => {
          const mapped: User[] = (r.data ?? []).map((u) => {
            const handle = u.username || u.id;
            return {
              id: `real-${u.id}`,
              name: u.displayName || u.username || "Anonymous",
              username: handle,
              avatar:
                u.imageUrl ||
                `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(handle)}`,
              bio: u.bio || "MCkew learner.",
              pencils: u.pencils,
              badge: null,
            };
          });
          setRealUsers(mapped);
        },
        () => setRealUsers([]),
      )
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => [...realUsers].sort((a, b) => b.pencils - a.pencils), [realUsers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (u) => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q),
    );
  }, [sorted, query]);

  const podiumCount = query.trim() ? 0 : Math.min(3, sorted.length);
  const hasPodium = podiumCount > 0;
  const top3 = sorted.slice(0, podiumCount);
  const restAll = query.trim() ? filtered : filtered.slice(podiumCount);
  const totalPages = Math.max(1, Math.ceil(restAll.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = restAll.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const startRank = query.trim()
    ? (safePage - 1) * PER_PAGE + 1
    : (hasPodium ? 4 : 1) + (safePage - 1) * PER_PAGE;

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <Navbar />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/10 blur-3xl"
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
            <LuTrophy size={14} /> LEADERBOARD
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            Top of the class
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            Earn pencils by solving questions and passing papers. Climb the ranks.
          </p>
        </motion.div>

        {/* Loading skeleton */}
        {loading && <LeaderboardSkeleton />}

        {/* Podium */}
        {!loading && (
          <Podium
            users={top3}
            openProfile={openProfile}
            onOpenProfile={(id) => setOpenProfile((cur) => (cur === id ? null : id))}
          />
        )}

        <div className="relative">
          <div className="pointer-events-none absolute -top-10 inset-x-0 h-10 bg-gradient-to-b from-transparent to-background" />
        </div>

        {/* Search */}
        <div className="mt-2 sm:mt-4">
          <SearchBar
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
          />
        </div>

        {/* Table header (desktop) */}
        <div className="hidden sm:grid grid-cols-[80px_1fr_140px_100px] gap-3 px-5 mt-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <div>Rank</div>
          <div>User</div>
          <div className="text-right">Pencils</div>
          <div className="text-right">Reward</div>
        </div>

        {/* List */}
        <LayoutGroup>
          <motion.ul layout className="mt-2 flex flex-col gap-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {paged.map((u, idx) => (
                <UserRow
                  key={u.id}
                  user={u}
                  rank={startRank + idx}
                  expanded={openProfile === u.id}
                  onToggle={() => setOpenProfile((cur) => (cur === u.id ? null : u.id))}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        </LayoutGroup>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-10 text-center text-muted-foreground text-sm"
          >
            No users match "{query}".
          </motion.div>
        )}

        {totalPages > 1 && (
          <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
        )}

        {/* Pencils explainer */}
        <div className="pt-8">
          <PencilsExplainer />
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Podium ─────────────────────────
function Podium({
  users,
  openProfile,
  onOpenProfile,
}: {
  users: User[];
  openProfile: string | null;
  onOpenProfile: (id: string) => void;
}) {
  if (users.length === 0) return null;
  const items =
    users.length === 1
      ? [{ user: users[0], rank: 1 }]
      : users.length === 2
        ? [
            { user: users[0], rank: 1 },
            { user: users[1], rank: 2 },
          ]
        : [
            { user: users[1], rank: 2 },
            { user: users[0], rank: 1 },
            { user: users[2], rank: 3 },
          ];
  const gridCols =
    users.length === 1 ? "grid-cols-1" : users.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="mt-8 sm:mt-12 relative">
      <Sparkles />
      <div className={cn("grid gap-1 sm:gap-2 items-end max-w-2xl mx-auto px-2", gridCols)}>
        {items.map((it, i) => (
          <PodiumColumn
            key={it.user.id}
            user={it.user}
            rank={it.rank}
            expanded={openProfile === it.user.id}
            onToggle={() => onOpenProfile(it.user.id)}
            indexDelay={i * 0.1}
          />
        ))}
      </div>
      <div className="pointer-events-none h-12 -mt-6 bg-gradient-to-b from-transparent to-background relative z-10" />
    </div>
  );
}

function Sparkles() {
  const dots = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 80,
        delay: Math.random() * 2,
        size: 8 + Math.random() * 10,
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
      {dots.map((d) => (
        <motion.div
          key={d.id}
          className="absolute text-yellow-400/70"
          style={{ left: `${d.left}%`, top: `${d.top}%` }}
          initial={{ opacity: 0, scale: 0, rotate: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            rotate: [0, 90, 180],
            y: [0, -10, -20],
          }}
          transition={{
            duration: 2.4,
            delay: d.delay,
            repeat: Infinity,
            repeatDelay: 1.5,
            ease: "easeOut",
          }}
        >
          <LuSparkles size={d.size} />
        </motion.div>
      ))}
    </div>
  );
}

function PodiumColumn({
  user,
  rank,
  expanded,
  onToggle,
  indexDelay,
}: {
  user: User;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
  indexDelay: number;
}) {
  const [hover, setHover] = useState(false);
  const showPopover = expanded || hover;

  const heightClass = rank === 1 ? "h-48 sm:h-64" : rank === 2 ? "h-32 sm:h-44" : "h-20 sm:h-32";
  const ringColor =
    rank === 1
      ? "ring-yellow-400 border-yellow-400"
      : rank === 2
        ? "ring-zinc-300 border-zinc-300"
        : "ring-amber-600 border-amber-600";
  const barGradient =
    rank === 1
      ? "bg-gradient-to-b from-yellow-400/30 via-yellow-300/15 to-card"
      : rank === 2
        ? "bg-gradient-to-b from-zinc-400/30 via-zinc-300/15 to-card"
        : "bg-gradient-to-b from-amber-600/30 via-amber-500/15 to-card";
  const trophyColor =
    rank === 1
      ? "text-yellow-500 bg-yellow-500/15"
      : rank === 2
        ? "text-zinc-500 bg-zinc-400/20"
        : "text-amber-700 bg-amber-700/15";

  return (
    <div
      className="flex flex-col items-center relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <AnimatePresence>
        {showPopover && <ProfilePopover user={user} onClose={onToggle} />}
      </AnimatePresence>

      <motion.div
        initial={{ y: -20, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 18,
          delay: 0.2 + indexDelay,
        }}
        className="relative"
      >
        {rank === 1 && (
          <motion.div
            className="absolute -top-7 left-1/2 -translate-x-1/2 text-yellow-500 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]"
            animate={{ y: [0, -3, 0], rotate: [-4, 4, -4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <LuCrown size={32} />
          </motion.div>
        )}
        <motion.div
          className={cn(
            "absolute inset-0 rounded-2xl",
            rank === 1 && "shadow-[0_0_40px_8px_rgba(250,204,21,0.5)]",
            rank === 2 && "shadow-[0_0_28px_6px_rgba(212,212,216,0.4)]",
            rank === 3 && "shadow-[0_0_24px_5px_rgba(180,83,9,0.4)]",
          )}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.button
          type="button"
          onClick={onToggle}
          whileHover={{ scale: 1.06, y: -2 }}
          whileTap={{ scale: 0.96 }}
          className={cn(
            "relative rounded-2xl overflow-hidden border-[3px] shadow-lg bg-card ring-2 ring-offset-2 ring-offset-background",
            rank === 1 ? "w-20 h-20 sm:w-28 sm:h-28" : "w-16 h-16 sm:w-24 sm:h-24",
            ringColor,
          )}
        >
          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
        </motion.button>
      </motion.div>

      <motion.button
        type="button"
        onClick={onToggle}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 + indexDelay }}
        className="mt-3 font-bold text-sm sm:text-lg text-foreground hover:text-primary transition-colors text-center max-w-full truncate px-1"
      >
        {user.name}
      </motion.button>
      <button
        type="button"
        onClick={onToggle}
        className="text-[11px] sm:text-xs text-muted-foreground hover:text-primary transition-colors truncate max-w-full px-1"
      >
        @{user.username}
      </button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 + indexDelay, duration: 0.3 }}
        className={cn(
          "mt-3 w-full rounded-t-2xl border-2 border-b-0 cursor-pointer relative overflow-hidden transition-shadow",
          heightClass,
          barGradient,
          rank === 1 && "border-yellow-400/60 hover:shadow-[0_-8px_30px_-5px_rgba(250,204,21,0.5)]",
          rank === 2 && "border-zinc-300/60 hover:shadow-[0_-8px_30px_-5px_rgba(212,212,216,0.4)]",
          rank === 3 && "border-amber-600/60 hover:shadow-[0_-8px_30px_-5px_rgba(180,83,9,0.4)]",
        )}
        onClick={onToggle}
      >
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{
            delay: 0.3 + indexDelay,
            duration: 0.7,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          style={{ transformOrigin: "bottom" }}
          className="absolute inset-0 flex flex-col items-center justify-start pt-3 sm:pt-5 gap-1.5 sm:gap-2"
        >
          <div
            className={cn(
              "text-2xl sm:text-4xl font-black leading-none",
              rank === 1 && "text-yellow-500",
              rank === 2 && "text-zinc-500",
              rank === 3 && "text-amber-700",
            )}
          >
            #{rank}
          </div>
          <div
            className={cn(
              "w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center",
              trophyColor,
            )}
          >
            {rank === 1 ? <LuTrophy size={20} /> : <LuMedal size={18} />}
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary font-bold text-xs sm:text-sm shadow-sm">
            <LuPencil size={14} />
            <span className="tabular-nums">{fmt(user.pencils)}</span>
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">pencils</div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ───────────────────────── Search ─────────────────────────
function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="relative max-w-md mx-auto"
    >
      <LuSearch
        size={16}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search users by name or @username"
        className="w-full pl-11 pr-10 py-3 rounded-full border-2 border-border bg-card text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors shadow-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition"
        >
          <LuX size={14} />
        </button>
      )}
    </motion.div>
  );
}

// ───────────────────────── Row ─────────────────────────
function UserRow({
  user,
  rank,
  expanded,
  onToggle,
}: {
  user: User;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const reward = Math.max(50, Math.floor(user.pencils / 1500));
  const [nameHover, setNameHover] = useState(false);
  const showPopover = expanded || nameHover;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="relative"
    >
      <AnimatePresence>
        {showPopover && <ProfilePopover user={user} onClose={onToggle} />}
      </AnimatePresence>

      <motion.div
        onClick={onToggle}
        whileHover={{ y: -2, scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className={cn(
          "w-full text-left rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-md transition-all px-3 sm:px-5 py-3 sm:py-3.5 cursor-pointer",
          "grid grid-cols-[40px_1fr_auto] sm:grid-cols-[80px_1fr_140px_100px] gap-2 sm:gap-3 items-center",
          showPopover && "border-primary/60 shadow-md",
        )}
      >
        <div className="flex items-center">
          <span
            className={cn(
              "inline-flex items-center justify-center min-w-[34px] h-7 px-2 rounded-full text-xs font-bold",
              rank <= 10 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            #{rank}
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <motion.img
            src={user.avatar}
            alt={user.name}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-border object-cover bg-muted shrink-0"
            whileHover={{ rotate: 6 }}
          />
          <div
            className="min-w-0 flex-1"
            onMouseEnter={() => setNameHover(true)}
            onMouseLeave={() => setNameHover(false)}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm sm:text-[15px] text-foreground truncate hover:text-primary transition-colors">
                {user.name}
              </span>
              {user.badge && <BadgeChip badge={user.badge} />}
            </div>
            <div className="text-[11px] sm:text-xs text-muted-foreground truncate hover:text-primary transition-colors">
              @{user.username}
            </div>
          </div>
        </div>

        <div className="flex sm:justify-end items-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-sm sm:text-base shadow-sm">
            <LuPencil size={14} />
            <span className="tabular-nums">{fmt(user.pencils)}</span>
          </span>
        </div>

        <div className="hidden sm:flex justify-end">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold">
            <LuStar size={12} /> {fmt(reward)}
          </span>
        </div>
      </motion.div>
    </motion.li>
  );
}

function BadgeChip({ badge }: { badge: NonNullable<Badge> }) {
  const map: Record<NonNullable<Badge>, { cls: string; icon: React.ReactNode }> = {
    EXPERT: {
      cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
      icon: <LuStar size={9} />,
    },
    ADMIN: {
      cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
      icon: <LuShieldCheck size={9} />,
    },
    PRO: { cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400", icon: <LuStar size={9} /> },
    MENTOR: {
      cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      icon: <LuShieldCheck size={9} />,
    },
  };
  const cfg = map[badge];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wider",
        cfg.cls,
      )}
    >
      {cfg.icon}
      {badge}
    </span>
  );
}

// ───────────────────────── Profile popover ─────────────────────────
function ProfilePopover({ user, onClose }: { user: User; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-30 w-[280px] sm:w-[320px]"
    >
      <div className="rounded-2xl border-2 border-border bg-card shadow-2xl p-4 relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
          className="absolute top-2 right-2 w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center transition"
        >
          <LuX size={14} />
        </button>
        <div className="flex items-center gap-3">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-14 h-14 rounded-2xl border-2 border-border object-cover bg-muted"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-foreground truncate">{user.name}</span>
              {user.badge && <BadgeChip badge={user.badge} />}
            </div>
            <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {user.bio}
        </p>
        {/* Pencils — single total */}
        <div className="mt-3 rounded-xl bg-primary/10 border border-primary/20 p-3 text-center">
          <div className="inline-flex items-center justify-center gap-1.5 text-primary font-black text-2xl leading-none">
            <LuPencil size={18} />
            <span className="tabular-nums">{fmt(user.pencils)}</span>
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Pencils
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/15 text-xs font-bold transition"
          >
            <LuUserPlus size={13} /> Follow
          </button>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/70 text-foreground text-xs font-bold transition"
          >
            <LuGift size={13} /> Gift
          </button>
        </div>
        <a
          href={`/profile/${user.username}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold transition shadow-sm"
        >
          Visit profile <LuArrowRight size={14} />
        </a>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-card border-r-2 border-b-2 border-border" />
      </div>
    </motion.div>
  );
}

// ───────────────────────── Pagination ─────────────────────────
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const pages = useMemo(() => {
    const arr: (number | "...")[] = [];
    const add = (n: number | "...") => arr.push(n);
    const window = 1;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - page) <= window) add(i);
      else if (arr[arr.length - 1] !== "...") add("...");
    }
    return arr;
  }, [page, totalPages]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-8 flex items-center justify-center gap-1.5 flex-wrap"
    >
      <PageBtn disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <LuChevronLeft size={14} />
      </PageBtn>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e-${i}`} className="px-2 text-muted-foreground text-sm">
            …
          </span>
        ) : (
          <PageBtn key={p} active={p === page} onClick={() => onChange(p)}>
            {p}
          </PageBtn>
        ),
      )}
      <PageBtn
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <LuChevronRight size={14} />
      </PageBtn>
    </motion.div>
  );
}

function PageBtn({
  children,
  active,
  disabled,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  "aria-label"?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      className={cn(
        "min-w-[36px] h-9 px-2.5 rounded-full text-sm font-bold inline-flex items-center justify-center transition-colors border-2",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-card text-foreground border-border hover:border-primary/50",
        disabled && "opacity-40 pointer-events-none",
      )}
    >
      {children}
    </motion.button>
  );
}

// ───────────────────────── Skeleton Loaders ─────────────────────────
function LeaderboardSkeleton() {
  return (
    <div className="mt-8 space-y-6">
      {/* Podium skeleton */}
      <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
        {[1, 2, 3].map((rank) => (
          <div
            key={rank}
            className={cn(
              "flex flex-col items-center",
              rank === 1 && "order-2",
              rank === 2 && "order-1",
              rank === 3 && "order-3",
            )}
          >
            <div className="skeleton skeleton-avatar w-10 h-10 mb-2" />
            <div className="skeleton skeleton-title w-20 h-6 mb-2" />
            <div className="skeleton w-16 h-4" />
          </div>
        ))}
      </div>

      {/* Search skeleton */}
      <div className="skeleton max-w-md mx-auto h-12 rounded-full" />

      {/* Table header skeleton */}
      <div className="hidden sm:grid grid-cols-[80px_1fr_140px_100px] gap-3 px-5">
        <div className="skeleton w-12 h-4" />
        <div className="skeleton w-16 h-4" />
        <div className="skeleton w-16 h-4 ml-auto" />
        <div className="skeleton w-12 h-4 ml-auto" />
      </div>

      {/* List rows skeleton */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[40px_1fr_auto] sm:grid-cols-[80px_1fr_140px_100px] gap-2 sm:gap-3 items-center px-3 sm:px-5 py-3 sm:py-3.5 rounded-2xl border-2 border-border bg-card"
          >
            <div className="skeleton w-8 h-7 rounded-full" />
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="skeleton w-9 h-9 sm:w-10 sm:h-10 rounded-full" />
              <div className="space-y-2">
                <div className="skeleton w-24 h-4" />
                <div className="skeleton w-16 h-3" />
              </div>
            </div>
            <div className="skeleton w-14 h-7 rounded-full" />
            <div className="hidden sm:block">
              <div className="skeleton w-12 h-6 rounded-full ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
