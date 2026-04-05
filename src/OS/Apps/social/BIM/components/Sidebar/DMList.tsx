/**
 * DMList — Direct message conversation list
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useBimStore } from "../../store/bimStore";
import { useDirectMessages } from "../../hooks/useDirectMessages";
import { useProfile } from "../../hooks/useProfile";
import { truncateAddress, addressToColor, getInitials } from "../../utils";
import styles from "../../BIM.module.css";

export function DMList() {
  const {
    activeDmConversationId,
    setActiveDmConversation,
    unreadCounts,
    profiles,
    inboxToWallet,
  } = useBimStore();
  const { dmConversations, createDm } = useDirectMessages();
  const { resolveProfiles } = useProfile();

  const [newDmAddress, setNewDmAddress] = useState("");
  const [showNewDm, setShowNewDm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Batch-resolve peer profiles for DM conversations
  const resolvedPeersRef = useRef<string | null>(null);
  useEffect(() => {
    if (dmConversations.length === 0) return;
    const peerAddresses = dmConversations
      .map((dm) => {
        // Use peerAddress if it looks like a wallet, otherwise resolve from inboxToWallet
        if (dm.peerAddress.startsWith("0x")) return dm.peerAddress.toLowerCase();
        return inboxToWallet[dm.peerInboxId]?.toLowerCase() ?? null;
      })
      .filter((a): a is string => !!a);
    const key = [...new Set(peerAddresses)].sort().join(",");
    if (key && key !== resolvedPeersRef.current) {
      resolvedPeersRef.current = key;
      resolveProfiles(peerAddresses);
    }
  }, [dmConversations, inboxToWallet, resolveProfiles]);

  const handleCreateDm = useCallback(async () => {
    if (!newDmAddress.trim()) return;
    setCreating(true);
    const convoId = await createDm(newDmAddress.trim());
    if (convoId) {
      setActiveDmConversation(convoId);
      setShowNewDm(false);
      setNewDmAddress("");
    }
    setCreating(false);
  }, [newDmAddress, createDm, setActiveDmConversation]);

  return (
    <div className={styles.dmSidebar}>
      <div className={styles.dmSidebarHeader}>
        <span>Messages</span>
      </div>

      <button
        className={styles.newDmButton}
        onClick={() => setShowNewDm(!showNewDm)}
      >
        {showNewDm ? "Cancel" : "+ New Message"}
      </button>

      {showNewDm && (
        <div style={{ padding: "0 10px 8px" }}>
          <input
            className={styles.dmSearchInput}
            style={{ margin: 0, width: "100%", marginBottom: 6 }}
            placeholder="Enter 0x address..."
            value={newDmAddress}
            onChange={(e) => setNewDmAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateDm()}
          />
          <button
            className={styles.modalButtonPrimary}
            onClick={handleCreateDm}
            disabled={creating || !newDmAddress.trim()}
            style={{ width: "100%", padding: "6px" }}
          >
            {creating ? "Creating..." : "Start Conversation"}
          </button>
        </div>
      )}

      <div className={styles.dmList}>
        {dmConversations.map((dm) => {
          const unread = unreadCounts[dm.id] ?? 0;
          const isActive = activeDmConversationId === dm.id;
          // Resolve peer address and profile
          const peerWallet = dm.peerAddress.startsWith("0x")
            ? dm.peerAddress.toLowerCase()
            : inboxToWallet[dm.peerInboxId]?.toLowerCase() ?? dm.peerAddress;
          const peerProfile = profiles[peerWallet.toLowerCase()];
          const peerDisplayName = peerProfile?.display_name ?? null;
          const peerAvatarUrl = peerProfile?.avatar_url ?? null;

          return (
            <div
              key={dm.id}
              className={`${styles.dmItem} ${isActive ? styles.dmItemActive : ""}`}
              onClick={() => setActiveDmConversation(dm.id)}
            >
              {peerAvatarUrl ? (
                <img
                  src={peerAvatarUrl}
                  alt={peerDisplayName ?? ""}
                  className={styles.dmAvatar}
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div
                  className={styles.dmAvatar}
                  style={{ background: addressToColor(peerWallet) }}
                >
                  {getInitials(peerDisplayName, peerWallet)}
                </div>
              )}
              <div className={styles.dmInfo}>
                <div className={styles.dmName}>
                  {peerDisplayName ?? truncateAddress(peerWallet, 6)}
                </div>
                {dm.lastMessage && (
                  <div className={styles.dmLastMessage}>{dm.lastMessage}</div>
                )}
              </div>
              {unread > 0 && !isActive && (
                <span className={styles.dmUnread}>{unread}</span>
              )}
            </div>
          );
        })}

        {dmConversations.length === 0 && !showNewDm && (
          <div className={styles.searchEmpty}>
            No conversations yet
          </div>
        )}
      </div>
    </div>
  );
}
