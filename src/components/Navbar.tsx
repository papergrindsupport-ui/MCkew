import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuGraduationCap,
  LuMenu,
  LuX,
  LuFileText,
  LuLeaf,
  LuFlaskConical,
  LuAtom,
  LuLayers,
  LuLayoutDashboard,
  LuChevronDown,
  LuSearch,
  LuTrophy,
  LuLogIn,
  LuUserCheck,
  LuUser,
  LuCopy,
  LuLogOut,
} from "react-icons/lu";
import { Link, useLocation } from "@tanstack/react-router";
import { useTheme, ColorThemeButton, DarkModeButton } from "./ThemeSwitcher";
import { useVibeStore } from "@/stores/useVibeStore";
import { cn } from "@/lib/utils";
import { GlobalSearchModal } from "@/components/smart-solve/GlobalSearchModal";
import { SignInModal } from "@/components/auth/SignInModal";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAccountStore } from "@/stores/useAccountStore";
import { UserButton, useUser } from "@clerk/clerk-react";
import { ProBadge } from "@/components/payments/ProBadge";
import toast from "react-hot-toast";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const PRIMARY_LINKS: NavItem[] = [
  { label: "Papers", href: "/smart-solve-papers", icon: LuFileText },
  { label: "Leaderboard", href: "/leaderboard", icon: LuTrophy },
  { label: "Dashboard", href: "/dashboard", icon: LuLayoutDashboard },
];

const SUBJECTS: (NavItem & { color: string })[] = [
  { label: "Biology", href: "/smart-solve-bio", icon: LuLeaf, color: "text-emerald-500" },
  { label: "Chemistry", href: "/smart-solve-chem", icon: LuFlaskConical, color: "text-sky-500" },
  { label: "Physics", href: "/smart-solve-phys", icon: LuAtom, color: "text-violet-500" },
  { label: "All", href: "/smart-solve-all", icon: LuLayers, color: "text-primary" },
];

// Removed Features / Pricing — keep navbar focused on the app itself.

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href.includes("#")) return false;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const theme = useTheme();
  const vibe = useVibeStore((s) => s.vibe);
  const isBoring = vibe === "boring";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const signedInAs = useAuthStore((s) => s.signedInAs);
  const { isSignedIn } = useUser();
  const subjectsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const pathname = location.pathname;

  // Cmd/Ctrl+K opens the global search modal everywhere EXCEPT:
  //   - /search (already a search page)
  //   - /smart-solve-* (those pages handle Cmd-K themselves to open their
  //     local contextual search modal). We detect this by pathname so the
  //     handler defers via early-return; the local SearchControl listens
  //     to a custom 'smartsolve:open-search' event we dispatch here would
  //     conflict — instead, the smart-solve pages own their own listener.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
      const path = window.location.pathname;
      if (path === "/search") return;
      if (path.startsWith("/smart-solve-")) return; // handled per-page
      e.preventDefault();
      setGlobalSearchOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close subjects menu on outside click / route change
  useEffect(() => {
    if (!subjectsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!subjectsRef.current?.contains(e.target as Node)) setSubjectsOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [subjectsOpen]);

  useEffect(() => {
    setSubjectsOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  const subjectActive = SUBJECTS.some((s) => isActive(pathname, s.href));

  return (
    <motion.nav
      initial={isBoring ? undefined : { y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={isBoring ? { duration: 0.1 } : { duration: 0.4, type: "spring", stiffness: 300 }}
      className="flex items-center justify-between px-3 sm:px-5 md:px-8 py-2 border-b border-border/60 sticky top-0 bg-background/80 backdrop-blur-xl z-50 print:hidden"
    >
      {/* Brand */}
      <Link to="/" className="shrink-0">
        <motion.div
          className="flex items-center gap-1.5 text-base sm:text-lg font-bold text-primary cursor-pointer"
          whileHover={isBoring ? undefined : { scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          <LuGraduationCap size={20} className="text-primary" />
          <span>MCkew</span>
        </motion.div>
      </Link>

      {/* Desktop links */}
      <div className="app-nav-desktop items-center gap-1">
        {PRIMARY_LINKS.map((item) => (
          <DesktopLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            isBoring={isBoring}
          />
        ))}

        {/* Subjects: button that opens a semi-circle radial menu */}
        <div ref={subjectsRef} className="relative">
          <motion.button
            type="button"
            onClick={() => setSubjectsOpen((o) => !o)}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "relative px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors",
              subjectActive
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            {subjectActive && (
              <motion.span
                layoutId="nav-active-pill"
                className="absolute inset-0 rounded-full bg-primary -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            Subjects
            <motion.span
              animate={{ rotate: subjectsOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <LuChevronDown size={12} />
            </motion.span>
          </motion.button>

          {/* Semi-circle menu (downward arc) */}
          <AnimatePresence>
            {subjectsOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-[260px] h-[150px] pointer-events-none"
              >
                {SUBJECTS.map((s, i) => {
                  // Spread across a downward semi-circle below the button.
                  const t = SUBJECTS.length === 1 ? 0.5 : i / (SUBJECTS.length - 1);
                  const angle = (180 + t * 180) * (Math.PI / 180);
                  const r = 110;
                  const x = Math.cos(angle) * r;
                  // sin(180..360) goes 0 → -1 → 0, so negate to get 0 → +1 → 0 (downward).
                  const y = -Math.sin(angle) * r;
                  const active = isActive(pathname, s.href);
                  return (
                    <motion.div
                      key={s.href}
                      initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                      animate={{ x, y, scale: 1, opacity: 1 }}
                      exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 380, damping: 22, delay: i * 0.04 }}
                      className="absolute left-1/2 top-0 -ml-12 pointer-events-auto"
                    >
                      <Link to={s.href} onClick={() => setSubjectsOpen(false)}>
                        <motion.div
                          whileHover={{ scale: 1.08, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            "w-24 px-2 py-2 rounded-2xl border-2 shadow-lg flex flex-col items-center gap-0.5 cursor-pointer transition-colors backdrop-blur-md",
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card/95 border-border hover:border-primary/60",
                          )}
                        >
                          <s.icon size={18} className={active ? "" : s.color} />
                          <span className="text-[11px] font-bold">{s.label}</span>
                        </motion.div>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <motion.button
          type="button"
          onClick={() => setGlobalSearchOpen(true)}
          aria-label="Open global search"
          whileTap={{ scale: 0.92 }}
          className="w-10 h-10 rounded-full flex items-center justify-center border-[2.5px] border-border bg-card shadow-sm cursor-pointer hover:border-primary/60 transition"
        >
          <LuSearch size={16} />
        </motion.button>
        <ColorThemeButton
          open={theme.open}
          setOpen={theme.setOpen}
          activeTheme={theme.activeTheme}
          setActiveTheme={theme.setActiveTheme}
        />
        <DarkModeButton isDark={theme.isDark} setIsDark={theme.setIsDark} />
        <ProBadge className="hidden sm:inline-flex" />
        {isSignedIn ? (
          <div className="flex items-center">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-9 h-9 ring-[2.5px] ring-border",
                  userButtonTrigger: "rounded-full hover:ring-primary/60 transition",
                },
              }}
            >
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Profile page"
                  labelIcon={<LuUser size={14} />}
                  href="/profile"
                />
              </UserButton.MenuItems>
            </UserButton>
          </div>
        ) : (
          <AnonOrSignInButton onSignIn={() => setSignInOpen(true)} />
        )}
        <motion.button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          whileTap={{ scale: 0.9 }}
          className="app-nav-mobile-toggle w-10 h-10 rounded-full items-center justify-center border-[2.5px] border-border bg-card shadow-sm cursor-pointer"
        >
          <motion.div
            animate={{ rotate: mobileOpen ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {mobileOpen ? <LuX size={18} /> : <LuMenu size={18} />}
          </motion.div>
        </motion.button>
      </div>

      <GlobalSearchModal open={globalSearchOpen} onOpenChange={setGlobalSearchOpen} />
      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} />

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="app-nav-mobile-only fixed inset-0 top-[var(--nav-h,52px)] bg-background/60 backdrop-blur-sm z-40 cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 280, damping: 24 }}
              className="app-nav-mobile-only absolute left-2 right-2 top-full mt-2 z-50 rounded-2xl border-[2.5px] border-border bg-card shadow-xl p-2"
            >
              <nav className="flex flex-col gap-1">
                {PRIMARY_LINKS.map((item) => (
                  <MobileLink
                    key={item.href}
                    item={item}
                    active={isActive(pathname, item.href)}
                    onNav={() => setMobileOpen(false)}
                  />
                ))}

                {/* Mobile collapsible subjects */}
                <MobileSubjectsCollapse pathname={pathname} onNav={() => setMobileOpen(false)} />
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

function DesktopLink({
  item,
  active,
  isBoring,
  hashLink,
}: {
  item: NavItem;
  active: boolean;
  isBoring: boolean;
  hashLink?: boolean;
}) {
  const Inner = (
    <motion.span
      whileHover={isBoring ? undefined : { y: -1 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors",
        active
          ? "text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active-pill"
          className="absolute inset-0 rounded-full bg-primary -z-10"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      <item.icon size={12} />
      {item.label}
    </motion.span>
  );
  return hashLink ? <a href={item.href}>{Inner}</a> : <Link to={item.href}>{Inner}</Link>;
}

function MobileLink({
  item,
  active,
  onNav,
  hashLink,
}: {
  item: NavItem;
  active: boolean;
  onNav: () => void;
  hashLink?: boolean;
}) {
  const cls = cn(
    "px-3 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer",
    active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted/60",
  );
  return hashLink ? (
    <a href={item.href} onClick={onNav} className={cls}>
      <item.icon size={14} /> {item.label}
    </a>
  ) : (
    <Link to={item.href} onClick={onNav} className={cls}>
      <item.icon size={14} /> {item.label}
    </Link>
  );
}

function MobileSubjectsCollapse({ pathname, onNav }: { pathname: string; onNav: () => void }) {
  const subjectActive = SUBJECTS.some((s) => isActive(pathname, s.href));
  const [open, setOpen] = useState(subjectActive);
  return (
    <div className="rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full px-3 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors",
          subjectActive ? "bg-primary/15 text-primary" : "text-foreground hover:bg-muted/60",
        )}
      >
        <LuLayers size={14} /> Subjects
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-auto"
        >
          <LuChevronDown size={14} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-1.5 p-1.5">
              {SUBJECTS.map((s) => {
                const active = isActive(pathname, s.href);
                return (
                  <Link key={s.href} to={s.href} onClick={onNav}>
                    <motion.div
                      whileTap={{ scale: 0.96 }}
                      className={cn(
                        "px-2.5 py-2 rounded-lg border-2 flex items-center gap-1.5 cursor-pointer transition-colors text-xs font-bold",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:border-primary/50",
                      )}
                    >
                      <s.icon size={14} className={active ? "" : s.color} />
                      {s.label}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnonOrSignInButton({ onSignIn }: { onSignIn: () => void }) {
  const profile = useAccountStore((s) => s.profile);
  const setProfile = useAccountStore((s) => s.setProfile);
  const setAnonId = useAccountStore((s) => s.setAnonId);
  const isAnon = profile?.account_type === "anonymous";
  const [open, setOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile?.image_url]);

  if (isAnon) {
    const anonId = profile?.public_id ?? profile?.username ?? "anon";
    const initials = (profile?.username || profile?.display_name || "A")
      .replace(/^anon-/, "")
      .slice(0, 2)
      .toUpperCase();
    const avatarUrl = profile?.image_url?.trim();

    const copyAnonId = async () => {
      try {
        await navigator.clipboard.writeText(anonId);
        toast.success("Anonymous ID copied");
      } catch {
        toast.error("Couldn't copy your anonymous ID");
      }
    };

    const signOutAnon = () => {
      setOpen(false);
      setProfile(null);
      setAnonId(null);
      toast.success("Signed out");
      // AccountProvider re-resolves a guest profile on fresh app boot.
      window.location.reload();
    };

    return (
      <div ref={ref} className="relative">
        <motion.button
          type="button"
          onClick={() => setOpen((o) => !o)}
          whileTap={{ scale: 0.92 }}
          aria-label="Anonymous account"
          className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center border-[2.5px] border-border bg-card shadow-sm cursor-pointer hover:border-primary/60 transition text-[11px] font-bold text-muted-foreground"
        >
          {avatarUrl && !avatarFailed ? (
            <img
              src={avatarUrl}
              alt=""
              className="size-full object-cover"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            initials
          )}
        </motion.button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-64 rounded-2xl border-[2.5px] border-border bg-card shadow-xl p-3 z-50"
            >
              <div className="flex items-center gap-2 mb-2">
                <LuUserCheck size={14} className="text-primary" />
                <span className="text-xs font-bold">Anonymous account</span>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 px-2.5 py-2 mb-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
                  Your ID
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs font-mono font-bold truncate flex-1">{anonId}</code>
                  <button
                    type="button"
                    onClick={copyAnonId}
                    className="h-7 px-2 rounded-md border border-border bg-card text-[11px] font-semibold inline-flex items-center gap-1 hover:border-primary/60 transition"
                    title="Copy ID"
                  >
                    <LuCopy size={12} /> Copy
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                Sign in normally to have a profile page and sync across devices.
              </p>
              <button
                type="button"
                onClick={signOutAnon}
                className="w-full mb-2 px-3 py-2 rounded-xl border border-destructive/40 text-destructive bg-destructive/5 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer hover:bg-destructive/10 transition"
              >
                <LuLogOut size={13} /> Sign out
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSignIn();
                }}
                className="w-full px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 transition"
              >
                <LuLogIn size={13} /> Sign in normally
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onSignIn}
      whileTap={{ scale: 0.95 }}
      className="px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border-[2.5px] border-border bg-card shadow-sm cursor-pointer hover:border-primary/60 transition"
    >
      <LuLogIn size={13} /> Sign in
    </motion.button>
  );
}
