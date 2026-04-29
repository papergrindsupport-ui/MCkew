// Profile editor at /profile. Tabbed: Overview, Academics, Universities,
// Flairs, Visibility, Profile settings. Has "Setup profile" wizard launcher
// and "Preview profile" button that goes to /profile/{username}.

import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/clerk-react";
import {
  ArrowLeft,
  Eye,
  Wand2,
  Save,
  RotateCcw,
  User,
  GraduationCap,
  Globe2,
  Sparkles,
  Settings,
  Lock,
  Unlock,
  Mail,
  Phone,
  Camera,
  Image as ImageIcon,
  Flame,
  BookOpen,
  FlaskConical,
  Atom,
  Trophy,
  CheckCircle2,
  Pencil,
  Target,
  LogIn,
} from "lucide-react";
import toast from "react-hot-toast";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import {
  useCurrentUser,
  updateCurrentUser,
  updateVisibility,
  avatarUrlFor,
  dicebearPreview,
  resetProfile,
} from "@/lib/profileStore";
import { EXAM_SESSIONS, type Subject } from "@/data/profileTypes";

import BioEditor from "@/components/profile/BioEditor";
import DifficultySlider from "@/components/profile/DifficultySlider";
import SchoolPicker from "@/components/profile/SchoolPicker";
import ExamSessionPicker from "@/components/profile/ExamSessionPicker";
import UniversityPicker from "@/components/profile/UniversityPicker";
import FlairBuilder from "@/components/profile/FlairBuilder";
import VisibilityToggle from "@/components/profile/VisibilityToggle";
import SetupWizard from "@/components/profile/SetupWizard";
import { ProfileSync } from "@/components/profile/ProfileSync";

export const Route = createFileRoute("/profile")({
  component: ProfileGate,
  validateSearch: (s: Record<string, unknown>): { tab?: string } => {
    const out: { tab?: string } = {};
    if (typeof s.tab === "string") out.tab = s.tab;
    return out;
  },
  head: () => ({ meta: [{ title: "Edit profile — MCkew" }] }),
});

function ProfileGate() {
  const { isLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();

  // While Clerk is initializing, show a soft skeleton instead of the full UI.
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-30 border-b-2 border-border bg-background/90 backdrop-blur">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} /> Home
            </Link>
            <h1 className="ml-2 text-xl font-bold text-foreground">Your profile</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full rounded-3xl border-2 border-border bg-card p-8 text-center space-y-4"
          >
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Lock size={24} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Sign in to view your profile</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Profiles need a real account so we can show your name, flairs, stats and badges across
              devices. Anonymous and guest accounts can still use the dashboard, planner and study
              tools — but the profile page is only available with a normal sign-in.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              <LogIn size={14} /> Back home to sign in
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return <ProfileEditor />;
}

const SUBJECTS: { id: Subject; label: string; Icon: typeof BookOpen }[] = [
  { id: "bio", label: "Biology", Icon: BookOpen },
  { id: "chem", label: "Chemistry", Icon: FlaskConical },
  { id: "phys", label: "Physics", Icon: Atom },
];

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function FieldRow({
  label,
  vKey,
  children,
  locked,
}: {
  label: string;
  vKey?: keyof ReturnType<typeof useCurrentUser>["visibility"];
  children: React.ReactNode;
  locked?: boolean;
}) {
  const me = useCurrentUser();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-bold">{label}</Label>
        {vKey && !locked && (
          <VisibilityToggle
            visible={me.visibility[vKey]}
            onToggle={() => updateVisibility({ [vKey]: !me.visibility[vKey] })}
            label={label}
          />
        )}
        {locked && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
            <Lock size={10} /> Always shown
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function ProfileEditor() {
  const me = useCurrentUser();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);
  const tab = search.tab ?? "overview";

  function setTab(next: string) {
    navigate({ search: { tab: next === "overview" ? undefined : next }, replace: true });
  }

  // When the user clicks "edit username / avatar / email / phone" anywhere,
  // we deep-link them to the settings tab.
  const goSettings = () => setTab("settings");

  const avatar = avatarUrlFor(me);
  const dicePreview = dicebearPreview(me.username);

  return (
    <div className="min-h-screen bg-background">
      <ProfileSync />
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b-2 border-border bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} /> Home
          </Link>
          <h1 className="ml-2 text-xl font-bold text-foreground">Your profile</h1>
          <div className="ml-auto flex items-center gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              onClick={() => setWizardOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border-2 border-primary text-primary text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Wand2 size={14} /> Setup profile
            </motion.button>
            <Link
              to="/profile/$username"
              params={{ username: me.username }}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              <Eye size={14} /> Preview profile
            </Link>
          </div>
        </div>
      </div>

      {/* Header card */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl border-2 border-border bg-card p-5 sm:p-6 overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <button
              type="button"
              onClick={goSettings}
              className="group relative shrink-0"
              aria-label="Edit avatar"
            >
              <motion.img
                src={avatar}
                alt=""
                whileHover={{ scale: 1.05, rotate: -3 }}
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl border-4 border-card shadow-md bg-muted object-cover"
              />
              <span className="absolute inset-0 rounded-3xl flex items-center justify-center bg-foreground/0 group-hover:bg-foreground/30 text-transparent group-hover:text-white transition-all">
                <Camera size={20} />
              </span>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-extrabold text-foreground truncate">
                  {me.displayName}
                </h2>
                <button
                  onClick={goSettings}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                >
                  <Pencil size={11} /> edit
                </button>
              </div>
              <button
                onClick={goSettings}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
              >
                @{me.username} <Pencil size={11} />
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-card-pink border-2 border-border font-bold">
                  <Flame size={12} /> {me.stats.streakDays} day streak
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-card-yellow border-2 border-border font-bold">
                  <Trophy size={12} /> {me.stats.pencils} pencils
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-card-green border-2 border-border font-bold">
                  <CheckCircle2 size={12} /> {me.stats.accuracy}% accuracy
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1 rounded-2xl">
            <TabsTrigger
              value="overview"
              className="rounded-xl text-xs sm:text-sm gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <User size={14} /> Overview
            </TabsTrigger>
            <TabsTrigger
              value="academics"
              className="rounded-xl text-xs sm:text-sm gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <GraduationCap size={14} /> Academics
            </TabsTrigger>
            <TabsTrigger
              value="universities"
              className="rounded-xl text-xs sm:text-sm gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Globe2 size={14} /> Universities
            </TabsTrigger>
            <TabsTrigger
              value="flairs"
              className="rounded-xl text-xs sm:text-sm gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Sparkles size={14} /> Flairs &amp; Goal
            </TabsTrigger>
            <TabsTrigger
              value="visibility"
              className="rounded-xl text-xs sm:text-sm gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Eye size={14} /> Visibility
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-xl text-xs sm:text-sm gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Settings size={14} /> Profile settings
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
              <TabsContent value="overview" className="mt-5 space-y-5">
                <div className="rounded-3xl border-2 border-border bg-card p-5 space-y-5">
                  <SectionTitle title="The basics" hint="What people see at a glance." />

                  <FieldRow label="Display name" vKey="displayName">
                    <Input
                      value={me.displayName}
                      onChange={(e) => updateCurrentUser({ displayName: e.target.value })}
                      className="h-11"
                    />
                  </FieldRow>

                  <FieldRow label="Role" vKey="role">
                    <div className="flex flex-wrap gap-2">
                      {(["student", "teacher", "volunteer"] as const).map((r) => (
                        <motion.button
                          key={r}
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          whileHover={{ y: -1 }}
                          onClick={() => updateCurrentUser({ role: r })}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 capitalize transition-colors ${
                            me.role === r
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:border-primary/50"
                          }`}
                        >
                          {r}
                        </motion.button>
                      ))}
                    </div>
                  </FieldRow>

                  <FieldRow label="Bio" vKey="bio">
                    <BioEditor
                      value={me.bio}
                      onChange={(html) => updateCurrentUser({ bio: html })}
                    />
                  </FieldRow>

                  <FieldRow label="Profile picture" vKey="profilePicture">
                    <div className="flex items-center gap-4">
                      <img
                        src={me.visibility.profilePicture ? avatar : dicePreview}
                        alt=""
                        className="h-16 w-16 rounded-2xl border-2 border-border bg-muted object-cover"
                      />
                      {!me.visibility.profilePicture && (
                        <div className="flex-1 text-xs text-muted-foreground">
                          You're hidden — visitors will see this random cool avatar instead.
                        </div>
                      )}
                      {me.visibility.profilePicture && (
                        <button
                          type="button"
                          onClick={goSettings}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          <ImageIcon size={12} /> Change picture
                        </button>
                      )}
                    </div>
                  </FieldRow>
                </div>

                <PrivacyCard />
              </TabsContent>

              <TabsContent value="academics" className="mt-5 space-y-5">
                <div className="rounded-3xl border-2 border-border bg-card p-5 space-y-5">
                  <SectionTitle title="School &amp; subjects" />

                  <FieldRow label="Favourite subject" vKey="favouriteSubject">
                    <div className="flex flex-wrap gap-2">
                      {SUBJECTS.map(({ id, label, Icon }) => (
                        <motion.button
                          key={id}
                          type="button"
                          whileTap={{ scale: 0.93 }}
                          whileHover={{ y: -2 }}
                          onClick={() => updateCurrentUser({ favouriteSubject: id })}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                            me.favouriteSubject === id
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:border-primary/50"
                          }`}
                        >
                          <Icon size={14} /> {label}
                        </motion.button>
                      ))}
                    </div>
                  </FieldRow>

                  <FieldRow label="School" vKey="school">
                    <SchoolPicker
                      value={me.school}
                      onChange={(v) => updateCurrentUser({ school: v })}
                    />
                  </FieldRow>

                  <FieldRow label="Exam sessions" vKey="examSessions">
                    <ExamSessionPicker
                      value={me.examSessions}
                      onChange={(next) => updateCurrentUser({ examSessions: next })}
                    />
                  </FieldRow>
                </div>

                <div className="rounded-3xl border-2 border-border bg-card p-5">
                  <SectionTitle
                    title="How do you find each subject?"
                    hint="Slide to set difficulty per subject."
                  />
                  <div className="grid sm:grid-cols-3 gap-3">
                    {SUBJECTS.map(({ id, label }) => (
                      <DifficultySlider
                        key={id}
                        label={`How do you find ${label}?`}
                        value={me.difficulty[id] ?? 50}
                        onChange={(v) =>
                          updateCurrentUser({ difficulty: { ...me.difficulty, [id]: v } })
                        }
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="universities" className="mt-5 space-y-5">
                <div className="rounded-3xl border-2 border-border bg-card p-5 space-y-4">
                  <SectionTitle
                    title="Target universities"
                    hint="Search the world's universities, filter by country, and add the ones you're aiming for."
                  />
                  <div className="flex justify-end">
                    <VisibilityToggle
                      visible={me.visibility.targetUniversities}
                      onToggle={() =>
                        updateVisibility({ targetUniversities: !me.visibility.targetUniversities })
                      }
                      label="Target universities"
                    />
                  </div>
                  <UniversityPicker
                    value={me.targetUniversities}
                    onChange={(next) => updateCurrentUser({ targetUniversities: next })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="flairs" className="mt-5 space-y-5">
                <div className="rounded-3xl border-2 border-border bg-card p-5 space-y-4">
                  <SectionTitle
                    title="Your flairs"
                    hint="Up to 5. Pick presets or build your own."
                  />
                  <div className="flex justify-end">
                    <VisibilityToggle
                      visible={me.visibility.flairs}
                      onToggle={() => updateVisibility({ flairs: !me.visibility.flairs })}
                      label="Flairs"
                    />
                  </div>
                  <FlairBuilder
                    value={me.flairs}
                    onChange={(next) => updateCurrentUser({ flairs: next })}
                  />
                </div>

                <div className="rounded-3xl border-2 border-border bg-card p-5 space-y-4">
                  <SectionTitle
                    title="Daily goal"
                    hint="Pencils, streaks &amp; questions answered are always shown — but your goal is up to you."
                  />
                  <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border-2 border-border">
                    <div>
                      <div className="text-sm font-bold flex items-center gap-1.5">
                        <Target size={14} /> Make my goal visible
                      </div>
                      <div className="text-xs text-muted-foreground">Maybe you get envy ;)</div>
                    </div>
                    <Switch
                      checked={me.visibility.goal}
                      onCheckedChange={(v) => updateVisibility({ goal: v })}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold">Papers per week</Label>
                      <Input
                        type="number"
                        min={0}
                        value={me.goal.papersPerWeek}
                        onChange={(e) =>
                          updateCurrentUser({
                            goal: { ...me.goal, papersPerWeek: Number(e.target.value) || 0 },
                          })
                        }
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold">Questions per day</Label>
                      <Input
                        type="number"
                        min={0}
                        value={me.goal.questionsPerDay}
                        onChange={(e) =>
                          updateCurrentUser({
                            goal: { ...me.goal, questionsPerDay: Number(e.target.value) || 0 },
                          })
                        }
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="visibility" className="mt-5">
                <div className="rounded-3xl border-2 border-border bg-card p-5 space-y-4">
                  <SectionTitle
                    title="Privacy &amp; visibility"
                    hint="Toggle exactly what shows up on your public profile."
                  />
                  <PrivacyCard />
                  <div className="grid sm:grid-cols-2 gap-2">
                    {(
                      [
                        ["displayName", "Display name"],
                        ["role", "Role"],
                        ["bio", "Bio"],
                        ["profilePicture", "Profile picture"],
                        ["favouriteSubject", "Favourite subject"],
                        ["school", "School"],
                        ["examSessions", "Exam sessions"],
                        ["targetUniversities", "Target universities"],
                        ["flairs", "Flairs"],
                        ["goal", "Daily goal"],
                        ["leaderboard", "Appear on leaderboard"],
                        ["email", "Email"],
                        ["phone", "Phone"],
                      ] as const
                    ).map(([k, label]) => (
                      <label
                        key={k}
                        className="flex items-center justify-between gap-2 p-3 rounded-2xl border-2 border-border bg-card hover:border-primary/30 transition-colors cursor-pointer"
                      >
                        <span className="text-sm font-semibold">{label}</span>
                        <Switch
                          checked={me.visibility[k]}
                          onCheckedChange={(v) => updateVisibility({ [k]: v })}
                        />
                      </label>
                    ))}
                  </div>

                  <div className="pt-2 border-t-2 border-border flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        resetProfile();
                        toast.success("Profile reset to defaults");
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive"
                    >
                      <RotateCcw size={12} /> Reset to defaults
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.success("Saved")}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90"
                    >
                      <Save size={14} /> Save changes
                    </button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-5">
                <div className="rounded-3xl border-2 border-border bg-card p-5 space-y-4">
                  <SectionTitle
                    title="Profile settings"
                    hint="Account-level identity (username, avatar, email, phone) lives here. Full account settings will move into Clerk soon."
                  />

                  <div className="grid gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold">Username</Label>
                      <Input
                        value={me.username}
                        onChange={(e) =>
                          updateCurrentUser({
                            username: e.target.value.replace(/\s/g, "").toLowerCase(),
                          })
                        }
                        className="h-11"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Used in your profile URL: /profile/{me.username}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold flex items-center gap-1.5">
                        <Mail size={12} /> Email
                      </Label>
                      <Input
                        type="email"
                        value={me.email}
                        onChange={(e) => updateCurrentUser({ email: e.target.value })}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold flex items-center gap-1.5">
                        <Phone size={12} /> Phone
                      </Label>
                      <Input
                        value={me.phone}
                        onChange={(e) => updateCurrentUser({ phone: e.target.value })}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold flex items-center gap-1.5">
                        <ImageIcon size={12} /> Profile picture
                      </Label>
                      <div className="flex items-center gap-4 p-3 rounded-2xl border-2 border-border">
                        <img
                          src={avatar}
                          alt=""
                          className="h-16 w-16 rounded-2xl border-2 border-border bg-muted object-cover"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold">
                            {me.hasProfilePicture ? "Custom picture" : "Auto avatar"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {me.hasProfilePicture
                              ? "Picture upload will be available with full account settings."
                              : "We generate a random cool avatar from your username."}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateCurrentUser({ hasProfilePicture: !me.hasProfilePicture })
                          }
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border-2 border-border bg-card text-xs font-bold hover:bg-muted"
                        >
                          {me.hasProfilePicture ? (
                            <>
                              <Unlock size={12} /> Use auto avatar
                            </>
                          ) : (
                            <>
                              <Camera size={12} /> Set custom (soon)
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-2xl border-2 border-dashed border-border bg-muted/40 text-center text-sm text-muted-foreground">
                    Full account settings coming soon — Clerk will live in this section.
                  </div>
                </div>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>

      <SetupWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}

function PrivacyCard() {
  const me = useCurrentUser();
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <label className="flex items-start gap-3 p-3 rounded-2xl border-2 border-border bg-card cursor-pointer">
        <Switch checked={me.isPublic} onCheckedChange={(v) => updateCurrentUser({ isPublic: v })} />
        <div>
          <div className="text-sm font-bold flex items-center gap-1.5">
            {me.isPublic ? <Unlock size={12} /> : <Lock size={12} />} Public profile
          </div>
          <div className="text-xs text-muted-foreground">
            When off, only you can see your /profile/{me.username} page.
          </div>
        </div>
      </label>
      <label className="flex items-start gap-3 p-3 rounded-2xl border-2 border-border bg-card cursor-pointer">
        <Switch
          checked={me.visibility.leaderboard}
          onCheckedChange={(v) => updateVisibility({ leaderboard: v })}
        />
        <div>
          <div className="text-sm font-bold flex items-center gap-1.5">
            <Trophy size={12} /> Appear on leaderboard
          </div>
          <div className="text-xs text-muted-foreground">
            Show up in the public leaderboard rankings.
          </div>
        </div>
      </label>
    </div>
  );
}
