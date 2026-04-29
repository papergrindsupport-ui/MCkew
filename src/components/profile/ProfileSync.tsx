// Bridges the local UserProfile store ("you") with the real Cloud profile.
// ----------------------------------------------------------------------
// On mount / when the Cloud profile id changes, copies real fields
// (display_name, username, email, phone, bio, image_url) into the local
// store so the editor shows the user's actual data.
//
// Then watches local edits and pushes a debounced PATCH to the Cloud
// profile so changes persist across devices.

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useProfile, useUpdateMyProfile } from "@/integrations/account/AccountProvider";
import { getCurrentUser, updateCurrentUser, useCurrentUser } from "@/lib/profileStore";

/** Fields we sync between local UserProfile and the Cloud profile. */
const SYNCED_KEYS = ["display_name", "username", "email", "phone", "bio", "image_url"] as const;

export function ProfileSync() {
  const { profile } = useProfile();
  const updateMyProfile = useUpdateMyProfile();
  const { user: clerkUser } = useUser();

  // Track the last hydrated cloud-profile id so we don't repeatedly clobber
  // local edits with stale cloud data.
  const hydratedFor = useRef<string | null>(null);

  // ---- 1. Hydrate local store from cloud (once per profile.id) ------------
  useEffect(() => {
    if (!profile) return;
    if (hydratedFor.current === profile.id) return;
    hydratedFor.current = profile.id;

    const me = getCurrentUser();

    // Prefer cloud profile fields; fall back to Clerk-supplied data, then local.
    const displayName =
      profile.display_name || clerkUser?.fullName || clerkUser?.firstName || me.displayName;

    const username = profile.username || clerkUser?.username || me.username;

    const email = profile.email || clerkUser?.primaryEmailAddress?.emailAddress || me.email;

    const phone = profile.phone || clerkUser?.primaryPhoneNumber?.phoneNumber || me.phone;

    const imageUrl = profile.image_url || clerkUser?.imageUrl || undefined;
    const bio = profile.bio ?? me.bio;

    updateCurrentUser({
      displayName,
      username,
      email,
      phone,
      bio,
      hasProfilePicture: Boolean(imageUrl),
      profilePictureUrl: imageUrl,
    });
  }, [profile, clerkUser]);

  // ---- 2. Push local edits back to cloud (debounced) ----------------------
  const me = useCurrentUser();
  const lastPushed = useRef<string>("");
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Don't push until we've hydrated at least once for the current profile.
    if (!profile || hydratedFor.current !== profile.id) return;

    const snapshot = {
      display_name: me.displayName,
      username: me.username,
      email: me.email,
      phone: me.phone,
      bio: me.bio,
      image_url: me.hasProfilePicture ? (me.profilePictureUrl ?? null) : null,
    };
    const key = JSON.stringify(snapshot);
    if (key === lastPushed.current) return;

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      const patch: Record<string, unknown> = {};
      for (const k of SYNCED_KEYS) {
        const localVal =
          k === "display_name"
            ? me.displayName
            : k === "image_url"
              ? me.hasProfilePicture
                ? (me.profilePictureUrl ?? null)
                : null
              : (me as unknown as Record<string, unknown>)[k];
        const cloudVal = (profile as unknown as Record<string, unknown>)[k];
        if (localVal !== cloudVal) patch[k] = localVal;
      }
      if (Object.keys(patch).length === 0) {
        lastPushed.current = key;
        return;
      }
      updateMyProfile(patch).then(
        () => {
          lastPushed.current = key;
        },
        (err) => {
          // Swallow — local edits stay; we'll retry on next change.
          // eslint-disable-next-line no-console
          console.warn("[profile] cloud sync failed:", err?.error || err);
        },
      );
    }, 600);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [me, profile, updateMyProfile]);

  return null;
}
