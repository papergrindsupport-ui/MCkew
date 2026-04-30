// Resolves a public profile by username — first tries the local dummy/seed
// store (rich UserProfile shape), then falls back to the live DB profile.
// The DB shape is mapped onto the UserProfile shape with sensible defaults
// so the existing /profile/$username UI keeps working.

import { useEffect, useState } from "react";
import { useUserByUsername } from "@/lib/profileStore";
import { useApi } from "@/integrations/account/useApi";
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
  publicId: string | null;
  followerCount: number;
  followingCount: number;
  viewerFollows: boolean;
  isMe: boolean;
  refresh: () => void;
} {
  const api = useApi();
  const seedUser = useUserByUsername(username);
  const [remote, setRemote] = useState<UserProfile | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [viewerFollows, setViewerFollows] = useState(false);
  const [isMe, setIsMe] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (seedUser) return; // local dummy/seed wins
    setLoading(true);
    setNotFound(false);
    api.getPublicProfile(username).then(
      (r) => {
        const p = r.profile;
        setAccountType(p.account_type ?? null);
        setPublicId(p.public_id ?? null);
        setFollowerCount(p.followerCount ?? 0);
        setFollowingCount(p.followingCount ?? 0);
        setViewerFollows(Boolean(p.viewerFollows));
        setIsMe(Boolean(p.isMe));
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
          syncIds: {
            profileUuid: p.id,
            publicId: p.public_id,
            clerkUserId: p.clerk_user_id ?? null,
          },
        };
        setRemote(mapped);
        setLoading(false);
      },
      () => {
        setRemote(undefined);
        setAccountType(null);
        setPublicId(null);
        setFollowerCount(0);
        setFollowingCount(0);
        setViewerFollows(false);
        setIsMe(false);
        setNotFound(true);
        setLoading(false);
      },
    );
  }, [username, seedUser, tick, api]);

  return {
    user: seedUser ?? remote,
    loading,
    notFound: !seedUser && notFound,
    accountType,
    publicId,
    followerCount,
    followingCount,
    viewerFollows,
    isMe,
    refresh: () => setTick((t) => t + 1),
  };
}
