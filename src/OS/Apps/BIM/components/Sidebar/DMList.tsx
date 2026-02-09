/**
 * DMList — Direct message conversation list
 */

"use client";

import { useState, useCallback } from "react";
import { useBimStore } from "../../store/bimStore";
import { useDirectMessages } from "../../hooks/useDirectMessages";
import { truncateAddress, addressToColor, getInitials } from "../../utils";
import styles from "../../BIM.module.css";

export function DMList() {
  const {
    activeDmConversationId,
    setActiveDmConversation,
    unreadCounts,
  } = useBimStore();
  const { dmConversations, createDm } = useDirectMessages();

  const [newDmAddress, setNewDmAddress] = useState("");
  const [showNewDm, setShowNewDm] = useState(false);
  const [creating, setCreating] = useState(false);

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
          return (
            <div
              key={dm.id}
              className={`${styles.dmItem} ${isActive ? styles.dmItemActive : ""}`}
              onClick={() => setActiveDmConversation(dm.id)}
            >
              <div
                className={styles.dmAvatar}
                style={{ background: addressToColor(dm.peerAddress) }}
              >
                {getInitials(null, dm.peerAddress)}
              </div>
              <div className={styles.dmInfo}>
                <div className={styles.dmName}>
                  {truncateAddress(dm.peerAddress, 6)}
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
