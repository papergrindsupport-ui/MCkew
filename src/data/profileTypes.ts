// All profile-related types. Pure type module — no runtime deps.

export type Role = "student" | "teacher" | "volunteer";
export type Subject = "bio" | "chem" | "phys";

export type ExamSession =
  | "may-jun-2026"
  | "oct-nov-2026"
  | "feb-mar-2027"
  | "may-jun-2027"
  | "oct-nov-2027"
  | "feb-mar-2028"
  | "may-jun-2028"
  | "oct-nov-2028";

export const EXAM_SESSIONS: { id: ExamSession; label: string }[] = [
  { id: "may-jun-2026", label: "May / June 2026" },
  { id: "oct-nov-2026", label: "Oct / Nov 2026" },
  { id: "feb-mar-2027", label: "Feb / March 2027" },
  { id: "may-jun-2027", label: "May / June 2027" },
  { id: "oct-nov-2027", label: "Oct / Nov 2027" },
  { id: "feb-mar-2028", label: "Feb / March 2028" },
  { id: "may-jun-2028", label: "May / June 2028" },
  { id: "oct-nov-2028", label: "Oct / Nov 2028" },
];

/** 0 = very easy, 100 = very hard */
export type DifficultyMap = Partial<Record<Subject, number>>;

export interface UniversityRef {
  name: string;
  country: string;
  countryCode?: string;
  domain?: string;
  webPage?: string;
}

export interface Flair {
  id: string;
  label: string;
  /** lucide icon name */
  icon: string;
  /** one of the design-system colors */
  color: "pink" | "blue" | "green" | "yellow" | "purple" | "primary";
}

export interface DailyGoal {
  papersPerWeek: number;
  questionsPerDay: number;
}

/** Per-field visibility map. true = public, false = hidden from /profile/{username}. */
export interface VisibilityMap {
  displayName: boolean;
  role: boolean;
  bio: boolean;
  email: boolean;
  phone: boolean;
  profilePicture: boolean;
  favouriteSubject: boolean;
  school: boolean;
  examSessions: boolean;
  targetUniversities: boolean;
  flairs: boolean;
  goal: boolean;
  leaderboard: boolean;
}

export interface UserStats {
  pencils: number;
  streakDays: number;
  papersPassed: number;
  correctQuestions: number;
  /** 0..100 */
  accuracy: number;
}

export interface UserProfile {
  username: string;
  displayName: string;
  role: Role;
  /** Tiptap HTML */
  bio: string;
  email: string;
  phone: string;
  /** if false, dicebear thumbs avatar is used (seed = username) */
  hasProfilePicture: boolean;
  profilePictureUrl?: string;

  isPublic: boolean;
  visibility: VisibilityMap;

  favouriteSubject?: Subject;
  school?: string;
  examSessions: ExamSession[];
  difficulty: DifficultyMap;
  targetUniversities: UniversityRef[];
  flairs: Flair[];
  goal: DailyGoal;

  stats: UserStats;

  followers: string[]; // usernames
  following: string[]; // usernames

  createdAt: number;

  /** When resolved from API — used for env-based ADMIN / VOLUNTEER / DEV badges */
  syncIds?: {
    profileUuid?: string;
    publicId?: string;
    clerkUserId?: string | null;
  };
}
