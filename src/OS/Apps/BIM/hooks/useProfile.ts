/**
 * useProfile — Profile management with ENS resolution
 */

"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { ensService } from "@/OS/lib/ENSService";
import { useBimStore } from "../store/bimStore";
import type { BimProfileData } from "../types";

export function useProfile() {
  const { address, isConnected } = useAppKitAccount();
  const {
    isXmtpReady,
    inboxId,
    myProfile,
    setMyProfile,
    setProfiles,
  } = useBimStore();

  const initRef = useRef(false);

  // Load or auto-create the current user's profile on XMTP ready
  useEffect(() => {
    if (!isConnected || !address || !isXmtpReady || initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        // 1. Try to fetch existing profile
        const res = await fetch(`/api/bim/profile?wallet=${address}`);
        const data = await res.json();
        let profile: BimProfileData | null = data.profile ?? null;

        // 2. Auto-create if it doesn't exist
        if (!profile) {
          const createRes = await fetch("/api/bim/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wallet: address,
              xmtp_inbox_id: inboxId,
            }),
          });
          const createData = await createRes.json();
          profile = createData.profile ?? null;
        }

        // 3. Update inbox ID if it's missing on the profile
        if (profile && !profile.xmtp_inbox_id && inboxId) {
          await fetch("/api/bim/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wallet: address,
              xmtp_inbox_id: inboxId,
            }),
          });
          profile = { ...profile, xmtp_inbox_id: inboxId };
        }

        // 4. Resolve ENS name and avatar if display_name or avatar_url are empty
        if (profile && (!profile.display_name || !profile.avatar_url)) {
          const [ensName, ensAvatar] = await Promise.all([
            !profile.display_name ? ensService.resolveName(address) : Promise.resolve(null),
            !profile.avatar_url ? ensService.getAvatar(address) : Promise.resolve(null),
          ]);

          const updates: Record<string, string> = {};
          if (ensName && !profile.display_name) {
            updates.display_name = ensName;
            profile = { ...profile, display_name: ensName };
          }
          if (ensAvatar && !profile.avatar_url) {
            updates.avatar_url = ensAvatar;
            profile = { ...profile, avatar_url: ensAvatar };
          }

          // Persist ENS-derived data to DB
          if (Object.keys(updates).length > 0) {
            await fetch("/api/bim/profile", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ wallet: address, ...updates }),
            });
          }
        }

        if (profile) {
          setMyProfile(profile);
          setProfiles([profile]);
        }
      } catch (err) {
        console.error("[BIM] Failed to load/create profile:", err);
      }
    };

    init();
  }, [isConnected, address, isXmtpReady, inboxId, setMyProfile, setProfiles]);

  // Reset on disconnect
  useEffect(() => {
    if (!isConnected) {
      initRef.current = false;
    }
  }, [isConnected]);

  // Update the current user's profile
  const updateProfile = useCallback(async (
    updates: { display_name?: string; avatar_url?: string; status?: string }
  ): Promise<BimProfileData | null> => {
    if (!address) return null;
    try {
      const res = await fetch("/api/bim/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, ...updates }),
      });
      const data = await res.json();
      const profile = data.profile as BimProfileData | null;
      if (profile) {
        setMyProfile(profile);
        setProfiles([profile]);
      }
      return profile;
    } catch (err) {
      console.error("[BIM] Failed to update profile:", err);
      return null;
    }
  }, [address, setMyProfile, setProfiles]);

  // Batch-fetch profiles for a list of addresses and populate the store cache
  const resolveProfiles = useCallback(async (addresses: string[]) => {
    if (addresses.length === 0) return;
    // Dedupe and filter out addresses we already have cached
    const cached = useBimStore.getState().profiles;
    const needed = [...new Set(addresses.map((a) => a.toLowerCase()))].filter(
      (a) => !cached[a]
    );
    if (needed.length === 0) return;

    try {
      // Batch fetch via the profiles API
      const res = await fetch("/api/bim/profile/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallets: needed }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profiles && data.profiles.length > 0) {
          setProfiles(data.profiles);
        }
      }
    } catch {
      // Fallback: fetch individual profiles
      for (const addr of needed) {
        try {
          const res = await fetch(`/api/bim/profile?wallet=${addr}`);
          const data = await res.json();
          if (data.profile) {
            setProfiles([data.profile]);
          }
        } catch {
          // skip
        }
      }
    }
  }, [setProfiles]);

  return {
    myProfile,
    updateProfile,
    resolveProfiles,
  };
}
