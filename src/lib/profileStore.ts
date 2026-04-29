// Profile store: safe localStorage overlay for the current user and the
// user's custom schools list. ONE storage key, JSON-encoded, quota-safe.
//
// Cross-user profile data lives in the backend (see publicProfileLookup).
// We only persist the *delta* for the local "you" user, plus any custom
// school names they've added, so the bundle stays predictable and storage
// stays tiny.

import { useSyncExternalStore } from "react";
import { SCHOOLS_SEED } from "@/data/referenceData";
import type { UserProfile } from "@/data/profileTypes";

const STORAGE_KEY = "smartsolve:profile:v1";
const CURRENT_USERNAME = "you";

interface PersistedShape {
  user?: UserProfile;
  customSchools?: string[];
}

// ─── safe storage I/O ──────────────────────────────────────────────────────

function readStorage(): PersistedShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedShape) : {};
  } catch {
    return {};
  }
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;
function writeStorage(data: PersistedShape) {
  if (typeof window === "undefined") return;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* swallow quota errors */
    }
  }, 200);
}

// ─── in-memory cache ───────────────────────────────────────────────────────

let cache: PersistedShape | null = null;
function loaded(): PersistedShape {
  if (cache) return cache;
  cache = readStorage();
  return cache;
}

/**
 * Cached snapshot for useSyncExternalStore. Must return the SAME reference
 * until something actually changes — otherwise React detects "snapshot
 * changed every render" and bails with "Maximum update depth exceeded".
 */
let userSnapshot: UserProfile | null = null;
function getUserSnapshot(): UserProfile {
  if (userSnapshot) return userSnapshot;
  userSnapshot = withDefaults(loaded().user);
  return userSnapshot;
}

const listeners = new Set<() => void>();
function emit() {
  // Invalidate memoized snapshots so subscribers re-read fresh values.
  userSnapshot = null;
  listeners.forEach((cb) => cb());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// ─── public reads ──────────────────────────────────────────────────────────

const BLANK_USER: UserProfile = {
  username: CURRENT_USERNAME,
  displayName: "You",
  role: "student",
  bio: "",
  email: "",
  phone: "",
  hasProfilePicture: false,
  isPublic: true,
  visibility: {
    displayName: true,
    role: true,
    bio: true,
    email: false,
    phone: false,
    profilePicture: true,
    favouriteSubject: true,
    school: true,
    examSessions: true,
    targetUniversities: true,
    flairs: true,
    goal: false,
    leaderboard: true,
  },
  favouriteSubject: "bio",
  school: "",
  examSessions: [],
  difficulty: {},
  targetUniversities: [],
  flairs: [],
  goal: { papersPerWeek: 0, questionsPerDay: 0 },
  stats: { pencils: 0, streakDays: 0, papersPassed: 0, correctQuestions: 0, accuracy: 0 },
  followers: [],
  following: [],
  createdAt: 0,
};

/** Ensure any legacy/partial persisted profile has all required nested fields. */
function withDefaults(u: UserProfile | undefined): UserProfile {
  if (!u) return BLANK_USER;
  return {
    ...BLANK_USER,
    ...u,
    visibility: { ...BLANK_USER.visibility, ...(u.visibility ?? {}) },
    stats: { ...BLANK_USER.stats, ...(u.stats ?? {}) },
    goal: { ...BLANK_USER.goal, ...(u.goal ?? {}) },
    difficulty: { ...(u.difficulty ?? {}) },
    examSessions: u.examSessions ?? [],
    targetUniversities: u.targetUniversities ?? [],
    flairs: u.flairs ?? [],
    followers: u.followers ?? [],
    following: u.following ?? [],
  };
}

export function getCurrentUser(): UserProfile {
  return getUserSnapshot();
}

export function getUserByUsername(username: string): UserProfile | undefined {
  if (username === CURRENT_USERNAME) return getCurrentUser();
  // Real cross-user profile data comes from the backend (see publicProfileLookup).
  return undefined;
}

export function getAllUsers(): UserProfile[] {
  return [getCurrentUser()];
}

const EMPTY_SCHOOLS: string[] = [];
export function getCustomSchools(): string[] {
  return loaded().customSchools ?? EMPTY_SCHOOLS;
}

let allSchoolsCache: { custom: string[] | null; result: string[] } = { custom: null, result: [] };
export function getAllSchools(): string[] {
  const custom = getCustomSchools();
  if (allSchoolsCache.custom === custom) return allSchoolsCache.result;
  const set = new Set<string>([...SCHOOLS_SEED, ...custom]);
  const result = Array.from(set).sort();
  allSchoolsCache = { custom, result };
  return result;
}

export const CURRENT_USERNAME_CONST = CURRENT_USERNAME;

// ─── writes ────────────────────────────────────────────────────────────────

export function updateCurrentUser(patch: Partial<UserProfile>) {
  const next: UserProfile = { ...getCurrentUser(), ...patch };
  cache = { ...loaded(), user: next };
  writeStorage(cache);
  emit();
}

export function updateVisibility(patch: Partial<UserProfile["visibility"]>) {
  const me = getCurrentUser();
  updateCurrentUser({ visibility: { ...me.visibility, ...patch } });
}

export function addCustomSchool(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const list = getCustomSchools();
  if (list.includes(trimmed) || SCHOOLS_SEED.includes(trimmed)) return;
  cache = { ...loaded(), customSchools: [...list, trimmed] };
  writeStorage(cache);
  emit();
}

export function resetProfile() {
  cache = {};
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  emit();
}

// ─── react hooks ───────────────────────────────────────────────────────────

export function useCurrentUser(): UserProfile {
  return useSyncExternalStore(subscribe, getCurrentUser, getCurrentUser);
}

export function useUserByUsername(username: string): UserProfile | undefined {
  return useSyncExternalStore(
    subscribe,
    () => getUserByUsername(username),
    () => getUserByUsername(username),
  );
}

export function useAllSchools(): string[] {
  return useSyncExternalStore(subscribe, getAllSchools, getAllSchools);
}

// ─── dicebear avatar URL (thumbs style) ────────────────────────────────────

export function avatarUrlFor(
  user: Pick<UserProfile, "username" | "hasProfilePicture" | "profilePictureUrl">,
): string {
  if (user.hasProfilePicture && user.profilePictureUrl) return user.profilePictureUrl;
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(user.username)}`;
}

export function dicebearPreview(seed: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
}
