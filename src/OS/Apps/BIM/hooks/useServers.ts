/**
 * useServers — Server CRUD via our API
 */

"use client";

import { useCallback, useEffect } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useBimStore } from "../store/bimStore";
import { getXmtpClient } from "./useXmtpClient";
import { ensureXmtpGroup } from "../lib/ensureXmtpGroup";
import { removeMemberFromXmtpGroups } from "../lib/syncGroupMembers";
import type { BimServerData, BimChannelData, BimMemberData } from "../types";

export function useServers() {
  const { address, isConnected } = useAppKitAccount();
  const {
    servers,
    setServers,
    addServer,
    removeServer,
    channels,
    setChannels,
    members,
    setMembers,
    isXmtpReady,
  } = useBimStore();

  // Fetch user's servers
  const fetchServers = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/bim/servers?wallet=${address}`);
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers ?? []);
      }
    } catch (err) {
      console.error("[BIM] Failed to fetch servers:", err);
    }
  }, [address, setServers]);

  // Load servers on mount / wallet connect
  useEffect(() => {
    if (isConnected && address && isXmtpReady) {
      fetchServers();
    }
  }, [isConnected, address, isXmtpReady, fetchServers]);

  // Create a new server
  const createServer = useCallback(async (name: string, description?: string): Promise<BimServerData | null> => {
    if (!address) return null;
    try {
      const res = await fetch("/api/bim/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, name, description }),
      });
      if (res.ok) {
        const data = await res.json();
        addServer(data.server);
        // Also load channels for new server
        if (data.channels) {
          setChannels(data.server.id, data.channels);

          // Eagerly create XMTP groups for the new server's channels
          const client = getXmtpClient();
          if (client && address) {
            for (const ch of data.channels as BimChannelData[]) {
              if (!ch.xmtp_group_id) {
                ensureXmtpGroup(client, {
                  serverId: data.server.id,
                  channelId: ch.id,
                  channelName: ch.name,
                  xmtpGroupId: null,
                  walletAddress: address,
                }).catch((err) => console.error("[BIM] Eager group create failed:", err));
              }
            }
          }
        }
        return data.server;
      }
    } catch (err) {
      console.error("[BIM] Failed to create server:", err);
    }
    return null;
  }, [address, addServer, setChannels]);

  // Delete a server
  const deleteServerAction = useCallback(async (serverId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/bim/servers/${serverId}?wallet=${address}`, {
        method: "DELETE",
      });
      if (res.ok) {
        removeServer(serverId);
        return true;
      }
    } catch (err) {
      console.error("[BIM] Failed to delete server:", err);
    }
    return false;
  }, [address, removeServer]);

  // Fetch channels for a server
  const fetchChannels = useCallback(async (serverId: string) => {
    try {
      const res = await fetch(`/api/bim/servers/${serverId}/channels`);
      if (res.ok) {
        const data = await res.json();
        setChannels(serverId, data.channels ?? []);
      }
    } catch (err) {
      console.error("[BIM] Failed to fetch channels:", err);
    }
  }, [setChannels]);

  // Create a channel
  const createChannel = useCallback(async (
    serverId: string,
    name: string,
    description?: string
  ): Promise<BimChannelData | null> => {
    if (!address) return null;
    try {
      const res = await fetch(`/api/bim/servers/${serverId}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, name, description }),
      });
      if (res.ok) {
        const data = await res.json();
        const channel = data.channel as BimChannelData;
        useBimStore.getState().addChannel(serverId, channel);

        // Eagerly create XMTP group for the new channel
        const client = getXmtpClient();
        if (client && address && !channel.xmtp_group_id) {
          ensureXmtpGroup(client, {
            serverId,
            channelId: channel.id,
            channelName: channel.name,
            xmtpGroupId: null,
            walletAddress: address,
          }).catch((err) => console.error("[BIM] Eager group create failed:", err));
        }

        return channel;
      }
    } catch (err) {
      console.error("[BIM] Failed to create channel:", err);
    }
    return null;
  }, [address]);

  // Fetch members for a server
  const fetchMembers = useCallback(async (serverId: string) => {
    try {
      const res = await fetch(`/api/bim/servers/${serverId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(serverId, data.members ?? []);
      }
    } catch (err) {
      console.error("[BIM] Failed to fetch members:", err);
    }
  }, [setMembers]);

  // Join a server by invite code
  const joinServer = useCallback(async (inviteCode: string): Promise<BimServerData | null> => {
    if (!address) return null;
    try {
      const res = await fetch(`/api/bim/servers/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, inviteCode }),
      });
      if (res.ok) {
        const data = await res.json();
        addServer(data.server);

        // Fetch channels for the joined server so the UI can display them
        const chRes = await fetch(`/api/bim/servers/${data.server.id}/channels`);
        if (chRes.ok) {
          const chData = await chRes.json();
          setChannels(data.server.id, chData.channels ?? []);
        }

        // Fetch members so member sync can work when channels are loaded
        const mRes = await fetch(`/api/bim/servers/${data.server.id}/members`);
        if (mRes.ok) {
          const mData = await mRes.json();
          setMembers(data.server.id, mData.members ?? []);
        }

        return data.server;
      }
    } catch (err) {
      console.error("[BIM] Failed to join server:", err);
    }
    return null;
  }, [address, addServer, setChannels, setMembers]);

  // Remove a member from the server and all XMTP groups
  const removeMemberAction = useCallback(async (
    serverId: string,
    targetWallet: string
  ): Promise<boolean> => {
    if (!address) return false;
    try {
      const res = await fetch(
        `/api/bim/servers/${serverId}/members?wallet=${address}&target=${targetWallet}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        useBimStore.getState().removeMember(serverId, targetWallet);

        // Also remove from all XMTP groups for this server's channels
        const client = getXmtpClient();
        const serverChannels = useBimStore.getState().channels[serverId] ?? [];
        const groupIds = serverChannels
          .map((ch) => ch.xmtp_group_id)
          .filter((id): id is string => !!id);

        if (client && groupIds.length > 0) {
          removeMemberFromXmtpGroups(client, groupIds, targetWallet).catch((err) =>
            console.error("[BIM] Failed to remove from XMTP groups:", err)
          );
        }

        return true;
      }
    } catch (err) {
      console.error("[BIM] Failed to remove member:", err);
    }
    return false;
  }, [address]);

  return {
    servers,
    channels,
    members,
    fetchServers,
    createServer,
    deleteServer: deleteServerAction,
    fetchChannels,
    createChannel,
    fetchMembers,
    joinServer,
    removeMember: removeMemberAction,
  };
}
