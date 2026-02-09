/**
 * BIM (Berry Instant Messaging)
 * Discord-like encrypted messaging using XMTP
 *
 * Routes:
 * - /bim                     → DMs view
 * - /bim/dm                  → DMs view
 * - /bim/dm/{conversationId} → Specific DM
 * - /bim/server/{serverId}   → Server view
 * - /bim/server/{serverId}/{channelId} → Server with specific channel
 */

"use client";

import { useEffect, useCallback, useMemo, useRef } from "react";
import type { AppComponentProps } from "@/OS/types/app";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKit } from "@reown/appkit/react";

import { useBimStore } from "./store/bimStore";
import { useXmtpClient, getXmtpClient } from "./hooks/useXmtpClient";
import { useServers } from "./hooks/useServers";
import { ensureXmtpGroup } from "./lib/ensureXmtpGroup";

import { ServerRail } from "./components/Sidebar/ServerRail";
import { ChannelList } from "./components/Sidebar/ChannelList";
import { DMList } from "./components/Sidebar/DMList";
import { MessageArea } from "./components/Chat/MessageArea";
import { MemberList } from "./components/Members/MemberList";
import { CreateServer } from "./components/Modals/CreateServer";
import { CreateChannel } from "./components/Modals/CreateChannel";
import { ServerSettings } from "./components/Modals/ServerSettings";
import { SearchOverlay } from "./components/Search/SearchOverlay";

import { parseBimRoute, bimRouteToPath, type BimInitialState } from "./types";
import styles from "./BIM.module.css";

export function BIM({ initialState, onStateChange }: AppComponentProps) {
  const { isConnected, address: userAddress } = useAppKitAccount();
  const { open: openWallet } = useAppKit();
  const { isReady: isXmtpReady, isConnecting: isXmtpConnecting, error: xmtpError } = useXmtpClient();

  const {
    activeView,
    activeServerId,
    activeChannelId,
    activeDmConversationId,
    setActiveView,
    setActiveServer,
    setActiveChannel,
    setActiveDmConversation,
    activeModal,
    showMemberList,
    showSearch,
    servers,
    channels,
    members,
  } = useBimStore();

  const { fetchChannels, fetchMembers } = useServers();

  // Stable ref for onStateChange to avoid dependency churn
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  // Parse initial state once on mount (deep linking)
  const initialParsedRef = useRef(false);
  useEffect(() => {
    if (initialParsedRef.current) return;
    const state = initialState as BimInitialState | undefined;
    if (state?.path) {
      initialParsedRef.current = true;
      const route = parseBimRoute(state.path);
      setActiveView(route.view);
      if (route.view === "server") {
        setActiveServer(route.serverId);
        if (route.channelId) setActiveChannel(route.channelId);
      } else if (route.view === "dm" && route.conversationId) {
        setActiveDmConversation(route.conversationId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialState]);

  // Helper to build the current path and notify the parent
  const notifyStateChange = useCallback(() => {
    const store = useBimStore.getState();
    let route;
    if (store.activeView === "server" && store.activeServerId) {
      route = { view: "server" as const, serverId: store.activeServerId, channelId: store.activeChannelId ?? undefined };
    } else {
      route = { view: "dm" as const, conversationId: store.activeDmConversationId ?? undefined };
    }
    onStateChangeRef.current?.({ path: bimRouteToPath(route) });
  }, []);

  // Subscribe to store navigation changes and push them to the parent.
  // This replaces the old "syncState" effect and fires only on actual
  // navigation state changes (not on every render).
  useEffect(() => {
    const unsub = useBimStore.subscribe(
      (state, prev) => {
        if (
          state.activeView !== prev.activeView ||
          state.activeServerId !== prev.activeServerId ||
          state.activeChannelId !== prev.activeChannelId ||
          state.activeDmConversationId !== prev.activeDmConversationId
        ) {
          // Build route from the *new* state directly
          let route;
          if (state.activeView === "server" && state.activeServerId) {
            route = { view: "server" as const, serverId: state.activeServerId, channelId: state.activeChannelId ?? undefined };
          } else {
            route = { view: "dm" as const, conversationId: state.activeDmConversationId ?? undefined };
          }
          onStateChangeRef.current?.({ path: bimRouteToPath(route) });
        }
      }
    );
    return unsub;
  }, []);

  // Load channels and members when server changes
  useEffect(() => {
    if (activeServerId) {
      fetchChannels(activeServerId);
      fetchMembers(activeServerId);
    }
  }, [activeServerId, fetchChannels, fetchMembers]);

  // Current server data
  const currentServer = useMemo(
    () => servers.find((s) => s.id === activeServerId),
    [servers, activeServerId]
  );
  const currentChannels = activeServerId ? (channels[activeServerId] ?? []) : [];
  const currentChannel = currentChannels.find((c) => c.id === activeChannelId);
  const currentMembers = activeServerId ? (members[activeServerId] ?? []) : [];

  // Ensure the active channel has an XMTP group (create one if missing)
  const ensureRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      !activeServerId ||
      !activeChannelId ||
      !currentChannel ||
      currentChannel.xmtp_group_id ||
      !isXmtpReady ||
      !userAddress
    ) return;
    // Prevent duplicate creation attempts for the same channel
    if (ensureRef.current === activeChannelId) return;
    ensureRef.current = activeChannelId;

    const client = getXmtpClient();
    if (!client) return;

    ensureXmtpGroup(client, {
      serverId: activeServerId,
      channelId: activeChannelId,
      channelName: currentChannel.name,
      xmtpGroupId: null,
      walletAddress: userAddress,
    }).finally(() => {
      ensureRef.current = null;
    });
  }, [activeServerId, activeChannelId, currentChannel, isXmtpReady, userAddress]);

  // User role in current server
  const userRole = useMemo(() => {
    if (!activeServerId || !userAddress) return "member";
    const member = currentMembers.find(
      (m) => m.wallet_address.toLowerCase() === userAddress.toLowerCase()
    );
    return member?.role ?? "member";
  }, [activeServerId, userAddress, currentMembers]);

  // ── Not connected ──────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className={styles.bim}>
        <div className={styles.connectPrompt}>
          <div className={styles.connectPromptIcon}>💬</div>
          <div className={styles.connectPromptTitle}>Berry Instant Messaging</div>
          <div className={styles.connectPromptText}>
            Connect your wallet to start messaging. BIM uses XMTP for
            end-to-end encrypted conversations.
          </div>
          <button className={styles.connectButton} onClick={() => openWallet()}>
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // ── XMTP initializing ─────────────────────────────────────
  if (!isXmtpReady) {
    return (
      <div className={styles.bim}>
        <div className={styles.xmtpInit}>
          {isXmtpConnecting ? (
            <>
              <img src="/icons/loader.gif" alt="Loading" className={styles.loaderGif} />
              <div className={styles.xmtpInitText}>
                Initializing XMTP...
              </div>
              <div className={styles.xmtpInitText} style={{ fontSize: 11, opacity: 0.7 }}>
                You may need to sign a message in your wallet
              </div>
            </>
          ) : xmtpError ? (
            <>
              <div className={styles.emptyStateIcon}>⚠</div>
              <div className={styles.emptyStateTitle}>Connection Failed</div>
              <div className={styles.emptyStateText}>{xmtpError}</div>
            </>
          ) : (
            <>
              <img src="/icons/loader.gif" alt="Loading" className={styles.loaderGif} />
              <div className={styles.xmtpInitText}>Connecting to XMTP network...</div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Main Layout ────────────────────────────────────────────
  return (
    <div className={styles.bim} style={{ position: "relative" }}>
      {/* Server Rail (leftmost) */}
      <ServerRail servers={servers} />

      {/* Sidebar: Channel List or DM List */}
      {activeView === "server" && currentServer ? (
        <ChannelList
          server={currentServer}
          channels={currentChannels}
          userRole={userRole}
        />
      ) : (
        <DMList />
      )}

      {/* Chat Area (center) */}
      {activeView === "server" ? (
        <MessageArea
          conversationId={currentChannel?.id ?? null}
          xmtpGroupId={currentChannel?.xmtp_group_id ?? null}
          channelName={currentChannel?.name}
          channelDescription={currentChannel?.description ?? undefined}
          isChannel
          memberAddresses={currentMembers.map((m) => m.wallet_address)}
        />
      ) : (
        <MessageArea
          conversationId={activeDmConversationId}
          xmtpGroupId={activeDmConversationId}
        />
      )}

      {/* Member List (right sidebar, server view only) */}
      {activeView === "server" && showMemberList && activeServerId && (
        <MemberList serverId={activeServerId} />
      )}

      {/* Search Overlay */}
      {showSearch && <SearchOverlay />}

      {/* Modals */}
      {activeModal === "createServer" && <CreateServer />}
      {activeModal === "createChannel" && <CreateChannel />}
      {activeModal === "serverSettings" && <ServerSettings />}
    </div>
  );
}

export default BIM;
