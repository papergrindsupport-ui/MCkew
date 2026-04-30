// Public profile page at /profile/{username}.
// Beautiful, smooth, tabbed, micro-interactive, respects visibility map.

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Mail,
  Phone,
  Flame,
  Trophy,
  CheckCircle2,
  Pencil,
  GraduationCap,
  BookOpen,
  FlaskConical,
  Atom,
  UserPlus,
  UserMinus,
  Gift,
  Lock,
  Calendar,
  Globe2,
  Sparkles,
  Target,
  ExternalLink,
  Share2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { countries } from "country-codes-flags-phone-codes";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { avatarUrlFor, updateCurrentUser, useCurrentUser } from "@/lib/profileStore";
import { usePublicProfileLookup } from "@/lib/publicProfileLookup";
import { EXAM_SESSIONS, type Subject } from "@/data/profileTypes";
import { FlairChip } from "@/components/profile/FlairBuilder";
import UsersListModal from "@/components/profile/UsersListModal";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/integrations/account/useApi";
import { GiftDrawer } from "@/components/gifts/GiftDrawer";
import { EnvRoleBadges } from "@/components/profile/EnvRoleBadges";
import { roleFlagsForCandidateIds } from "@/lib/envRoleBadges";

export const Route = createFileRoute("/profile/$username")({
  component: PublicProfile,
  loader: ({ params }) => {
    return { username: params.username };
  },
});

function flagFor(code?: string) {
  if (!code) return null;
  return countries.find((c) => c.code === (code ?? "").toUpperCase())?.flag ?? null;
}

const SUBJECT_META: Record<Subject, { label: string; Icon: LucideIcon; color: string }> = {
  bio: { label: "Biology", Icon: BookOpen, color: "card-green" },
  chem: { label: "Chemistry", Icon: FlaskConical, color: "card-blue" },
  phys: { label: "Physics", Icon: Atom, color: "card-purple" },
};

function PublicProfile() {
  const { username } = Route.useParams();
  const {
    user,
    loading,
    notFound,
    accountType,
    publicId,
    followerCount,
    followingCount,
    viewerFollows,
    isMe: serverIsMe,
    refresh,
  } = usePublicProfileLookup(username);
  const api = useApi();
  const me = useCurrentUser();
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [tab, setTab] = useState("about");
  const [giftOpen, setGiftOpen] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [optimisticFollowing, setOptimisticFollowing] = useState<boolean | null>(null);
  const [optimisticFollowerCount, setOptimisticFollowerCount] = useState<number | null>(null);
  const isFollowingServer = optimisticFollowing ?? viewerFollows;
  const liveFollowerCount = optimisticFollowerCount ?? followerCount;

  const envRoleFlags = useMemo(
    () =>
      roleFlagsForCandidateIds([
        user?.syncIds?.clerkUserId,
        user?.syncIds?.profileUuid,
        user?.syncIds?.publicId,
        publicId,
        user?.username,
      ]),
    [user?.syncIds, user?.username, publicId],
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 text-center">
        <div>
          {loading ? (
            <div className="w-[320px] rounded-2xl border-2 border-border bg-card p-5 text-left space-y-3">
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-10 w-28 rounded-xl" />
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-extrabold">
                {notFound ? "User not found" : "User not found"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">No profile for @{username}.</p>
            </>
          )}
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft size={14} /> Back home
          </Link>
        </div>
      </div>
    );
  }

  if (accountType === "anonymous") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 text-center">
        <div className="max-w-md">
          <h1 className="text-3xl font-extrabold">Anonymous User</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This is an anonymous user. They've no profile.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft size={14} /> Back home
          </Link>
        </div>
      </div>
    );
  }

  const isMe = serverIsMe;
  const v = user.visibility;
  const isFollowing = isFollowingServer;

  if (!user.isPublic && !isMe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 text-center">
        <div className="max-w-sm">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted inline-flex items-center justify-center">
            <Lock size={24} className="text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold">This profile is private</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            @{user.username} hasn't made their profile public.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft size={14} /> Back home
          </Link>
        </div>
      </div>
    );
  }

  function showOrLock<T>(visible: boolean, value: T): T | null {
    if (isMe) return value;
    return visible ? value : null;
  }

  async function toggleFollow() {
    if (isMe || !publicId || followBusy) return;
    const wasFollowing = isFollowing;
    setFollowBusy(true);
    setOptimisticFollowing(!wasFollowing);
    setOptimisticFollowerCount(liveFollowerCount + (wasFollowing ? -1 : 1));
    try {
      if (wasFollowing) await api.unfollowUser(publicId);
      else await api.followUser(publicId);
      // Mirror to local seed-store list for the legacy followers UI.
      if (user) {
        if (wasFollowing) {
          updateCurrentUser({ following: me.following.filter((u) => u !== user.username) });
          toast(`Unfollowed @${user.username}`);
        } else {
          updateCurrentUser({ following: [...me.following, user.username] });
          toast.success(`Following @${user.username}`);
        }
      }
    } catch (e: any) {
      setOptimisticFollowing(wasFollowing);
      setOptimisticFollowerCount(liveFollowerCount);
      const msg: string = e?.error || "Could not update follow";
      if (e?.status === 401) toast.error("Sign in to follow users.");
      else toast.error(msg);
    } finally {
      setFollowBusy(false);
    }
  }

  const displayName = showOrLock(v.displayName, user.displayName) ?? `@${user.username}`;
  const showRole = isMe || v.role;
  const showBio = isMe || v.bio;
  const showSchool = isMe || v.school;
  const showFav = isMe || v.favouriteSubject;
  const showSessions = isMe || v.examSessions;
  const showUnis = isMe || v.targetUniversities;
  const showFlairs = isMe || v.flairs;
  const showGoal = isMe || v.goal;
  const showEmail = isMe || v.email;
  const showPhone = isMe || v.phone;
  const showPic = isMe || v.profilePicture;

  const avatar = showPic
    ? avatarUrlFor(user)
    : avatarUrlFor({ username: user.username, hasProfilePicture: false });

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-40 sm:h-48 bg-card-pink border-b-2 border-border overflow-hidden">
        <motion.div
          aria-hidden
          className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-card-yellow/60"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-card-blue/60"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 h-full flex items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-foreground/80 hover:text-foreground"
          >
            <ArrowLeft size={14} /> Home
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                try {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied");
                } catch {
                  toast.error("Couldn't copy");
                }
              }}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border-2 border-border bg-card/80 backdrop-blur text-sm font-bold hover:bg-card"
            >
              <Share2 size={14} /> Share
            </button>
            {isMe && (
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border-2 border-primary/50 bg-primary/10 text-primary text-sm font-bold hover:bg-primary/15"
              >
                <Pencil size={14} /> Edit
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 -mt-16 sm:-mt-20 relative">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}
          className="rounded-3xl border-2 border-border bg-card p-5 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            <motion.img
              src={avatar}
              alt=""
              initial={{ scale: 0.85, rotate: -6, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.05 }}
              whileHover={{ rotate: -3, scale: 1.04 }}
              className="h-28 w-28 sm:h-32 sm:w-32 rounded-3xl border-4 border-card shadow-lg bg-muted object-cover -mt-16"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground truncate">
                  {displayName}
                </h1>
                <EnvRoleBadges flags={envRoleFlags} />
                {showRole && (
                  <motion.span
                    whileHover={{ y: -2 }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card-purple border-2 border-border text-[11px] font-bold capitalize"
                  >
                    {user.role}
                  </motion.span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">@{user.username}</div>

              {showFlairs && user.flairs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <AnimatePresence>
                    {user.flairs.map((f) => (
                      <FlairChip key={f.id} flair={f} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              {!isMe && (
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    whileHover={{ y: -2 }}
                    onClick={toggleFollow}
                    disabled={followBusy || !publicId}
                    className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-bold transition-colors disabled:opacity-60 ${
                      isFollowing
                        ? "bg-card border-2 border-border text-foreground hover:bg-muted"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus size={14} /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} /> Follow
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    whileHover={{ rotate: -8 }}
                    onClick={() => publicId && setGiftOpen(true)}
                    disabled={!publicId}
                    className="inline-flex items-center justify-center h-10 w-10 rounded-xl border-2 border-border bg-card hover:bg-card-pink disabled:opacity-50"
                    aria-label="Send gift"
                    title="Send a gift"
                  >
                    <Gift size={16} />
                  </motion.button>
                </div>
              )}

              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setFollowersOpen(true)}
                  className="hover:text-primary"
                >
                  <span className="font-extrabold">{liveFollowerCount}</span>{" "}
                  <span className="text-muted-foreground">followers</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFollowingOpen(true)}
                  className="hover:text-primary"
                >
                  <span className="font-extrabold">{followingCount}</span>{" "}
                  <span className="text-muted-foreground">following</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Stat tone="pink" Icon={Flame} value={user.stats.streakDays} label="Day streak" />
            <Stat tone="yellow" Icon={Trophy} value={user.stats.pencils} label="Pencils" />
            <Stat
              tone="green"
              Icon={CheckCircle2}
              value={user.stats.correctQuestions}
              label="Correct Qs"
            />
            <Stat
              tone="blue"
              Icon={GraduationCap}
              value={user.stats.papersPassed}
              label="Papers passed"
            />
            <Stat tone="purple" Icon={Target} value={`${user.stats.accuracy}%`} label="Accuracy" />
          </div>
        </motion.div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted/40 p-1 rounded-2xl">
            <TabsTrigger
              value="about"
              className="rounded-xl gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <BookOpen size={14} /> About
            </TabsTrigger>
            <TabsTrigger
              value="academics"
              className="rounded-xl gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <GraduationCap size={14} /> Academics
            </TabsTrigger>
            <TabsTrigger
              value="unis"
              className="rounded-xl gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Globe2 size={14} /> Universities
            </TabsTrigger>
            <TabsTrigger
              value="contact"
              className="rounded-xl gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Mail size={14} /> Contact
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <TabsContent value="about" className="mt-5 space-y-5">
                {showBio ? (
                  <Card title="Bio">
                    <div
                      className="prose prose-sm max-w-none text-foreground"
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{
                        __html: user.bio || "<p><em>No bio yet.</em></p>",
                      }}
                    />
                  </Card>
                ) : (
                  <HiddenCard label="Bio" />
                )}

                {showGoal && (
                  <Card title="Daily goal">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <GoalStat label="Papers / week" value={user.goal.papersPerWeek} />
                      <GoalStat label="Questions / day" value={user.goal.questionsPerDay} />
                    </div>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="academics" className="mt-5 space-y-5">
                {showFav && user.favouriteSubject && (
                  <Card title="Favourite subject">
                    {(() => {
                      const meta = SUBJECT_META[user.favouriteSubject!];
                      const Icon = meta.Icon;
                      return (
                        <motion.div
                          whileHover={{ y: -2 }}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-border bg-${meta.color}`}
                        >
                          <Icon size={18} />
                          <span className="font-bold">{meta.label}</span>
                        </motion.div>
                      );
                    })()}
                  </Card>
                )}

                {showSchool && user.school && (
                  <Card title="School">
                    <div className="inline-flex items-center gap-2 text-sm font-bold">
                      <MapPin size={14} className="text-primary" /> {user.school}
                    </div>
                  </Card>
                )}

                {showSessions && user.examSessions.length > 0 && (
                  <Card title="Exam sessions">
                    <div className="flex flex-wrap gap-1.5">
                      {user.examSessions.map((s, i) => {
                        const lbl = EXAM_SESSIONS.find((x) => x.id === s)?.label ?? s;
                        return (
                          <motion.span
                            key={s}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.04 }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card-blue border-2 border-border text-xs font-bold"
                          >
                            <Calendar size={12} /> {lbl}
                          </motion.span>
                        );
                      })}
                    </div>
                  </Card>
                )}

                <Card title="How they find each subject">
                  <div className="grid sm:grid-cols-3 gap-3">
                    {(Object.keys(SUBJECT_META) as Subject[]).map((s) => {
                      const v = user.difficulty[s];
                      const meta = SUBJECT_META[s];
                      const Icon = meta.Icon;
                      return (
                        <div
                          key={s}
                          className={`p-3 rounded-2xl border-2 border-border bg-${meta.color}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="inline-flex items-center gap-1.5 font-bold text-sm">
                              <Icon size={14} /> {meta.label}
                            </div>
                            <span className="text-[10px] font-bold text-foreground/70">
                              {v == null ? "—" : v < 30 ? "Easy" : v < 70 ? "Med" : "Hard"}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
                            <motion.div
                              className="h-full bg-foreground/60 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${v ?? 0}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="unis" className="mt-5 space-y-5">
                {showUnis ? (
                  user.targetUniversities.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No target universities yet.
                    </p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {user.targetUniversities.map((u, i) => (
                        <motion.div
                          key={u.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          whileHover={{ y: -3 }}
                          className="p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-2xl leading-none">
                              {flagFor(u.countryCode) ?? <Globe2 size={18} />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="font-extrabold text-foreground">{u.name}</div>
                              <div className="text-xs text-muted-foreground">{u.country}</div>
                              {u.webPage && (
                                <a
                                  href={u.webPage}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  Visit website <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )
                ) : (
                  <HiddenCard label="Target universities" />
                )}
              </TabsContent>

              <TabsContent value="contact" className="mt-5 space-y-5">
                <Card title="Contact">
                  <div className="space-y-2">
                    {showEmail && user.email ? (
                      <a
                        href={`mailto:${user.email}`}
                        className="flex items-center gap-2 text-sm font-semibold hover:text-primary"
                      >
                        <Mail size={14} /> {user.email}
                      </a>
                    ) : (
                      <HiddenLine label="Email" Icon={Mail} />
                    )}
                    {showPhone && user.phone ? (
                      <a
                        href={`tel:${user.phone}`}
                        className="flex items-center gap-2 text-sm font-semibold hover:text-primary"
                      >
                        <Phone size={14} /> {user.phone}
                      </a>
                    ) : (
                      <HiddenLine label="Phone" Icon={Phone} />
                    )}
                  </div>
                </Card>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>

      <UsersListModal
        open={followersOpen}
        onOpenChange={setFollowersOpen}
        title="Followers"
        usernames={user.followers}
      />
      <UsersListModal
        open={followingOpen}
        onOpenChange={setFollowingOpen}
        title="Following"
        usernames={user.following}
      />
      {!isMe && (
        <GiftDrawer
          open={giftOpen}
          onOpenChange={setGiftOpen}
          recipient={
            publicId
              ? {
                  publicId,
                  username: user.username,
                  displayName: user.displayName,
                  imageUrl: user.profilePictureUrl ?? null,
                }
              : null
          }
          onSent={() => refresh()}
        />
      )}
    </div>
  );
}

function Stat({
  tone,
  Icon,
  value,
  label,
}: {
  tone: "pink" | "yellow" | "green" | "blue" | "purple";
  Icon: LucideIcon;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3, rotate: -1 }}
      className={`p-3 rounded-2xl border-2 border-border bg-card-${tone} text-center`}
    >
      <div className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-card/60 border-2 border-border">
        <Icon size={13} />
      </div>
      <div className="mt-1 text-lg font-extrabold leading-none">{value}</div>
      <div className="text-[10px] font-bold text-foreground/70 uppercase tracking-wide">
        {label}
      </div>
    </motion.div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border-2 border-border bg-card p-5"
    >
      <h3 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <Sparkles size={12} /> {title}
      </h3>
      {children}
    </motion.section>
  );
}

function HiddenCard({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border bg-muted/30 p-5 text-center text-sm text-muted-foreground">
      <Lock size={14} className="inline mr-1" /> {label} hidden by user.
    </div>
  );
}

function HiddenLine({ label, Icon }: { label: string; Icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
      <Icon size={14} /> {label} hidden
    </div>
  );
}

function GoalStat({ label, value }: { label: string; value: number }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-3 rounded-2xl border-2 border-border bg-card-yellow text-center"
    >
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-[10px] font-bold text-foreground/70 uppercase tracking-wide">
        {label}
      </div>
    </motion.div>
  );
}
