// Resolves a public profile by username — first tries the local dummy/seed
// store (rich UserProfile shape), then falls back to the live DB profile.
// The DB shape is mapped onto the UserProfile shape with sensible defaults
// so the existing /profile/$username UI keeps working.

import { useEffect, useState } from "react";
import { useUserByUsername } from "@/lib/profileStore";
import { createApiClient } from "@/lib/apiClient";
import type { UserProfile } from "@/data/profileTypes";

const baseVisibility = {
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
};

export function usePublicProfileLookup(username: string): {
  user: UserProfile | undefined;
  loading: boolean;
  notFound: boolean;
  accountType: string | null;
} {
  const seedUser = useUserByUsername(username);
  const [remote, setRemote] = useState<UserProfile | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [accountType, setAccountType] = useState<string | null>(null);

  useEffect(() => {
    if (seedUser) return; // local dummy/seed wins
    setLoading(true);
    setNotFound(false);
    const api = createApiClient();
    api.getPublicProfile(username).then(
      (r) => {
        const p = r.profile;
        setAccountType(p.account_type ?? null);
        const mapped: UserProfile = {
          username: p.username || username,
          displayName: p.display_name || p.username || "Anonymous",
          role: "student",
          bio: p.bio || "",
          email: p.email || "",
          phone: p.phone || "",
          hasProfilePicture: Boolean(p.image_url),
          profilePictureUrl: p.image_url ?? undefined,
          isPublic: true,
          visibility: { ...baseVisibility },
          examSessions: [],
          difficulty: {},
          targetUniversities: [],
          flairs: [],
          goal: { papersPerWeek: 0, questionsPerDay: 0 },
          stats: {
            pencils: p.pencils,
            streakDays: 0,
            papersPassed: 0,
            correctQuestions: 0,
            accuracy: 0,
          },
          followers: [],
          following: [],
          createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
        };
        setRemote(mapped);
        setLoading(false);
      },
      () => {
        setRemote(undefined);
        setAccountType(null);
        setNotFound(true);
        setLoading(false);
      },
    );
  }, [username, seedUser]);

  return {
    user: seedUser ?? remote,
    loading,
    notFound: !seedUser && notFound,
    accountType,
  };
}
