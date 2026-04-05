/**
 * CreateChannel — Create a new channel modal
 */

"use client";

import { useState, useCallback } from "react";
import { useBimStore } from "../../store/bimStore";
import { useServers } from "../../hooks/useServers";
import styles from "../../BIM.module.css";

export function CreateChannel() {
  const { activeServerId, setActiveModal, setActiveChannel } = useBimStore();
  const { createChannel } = useServers();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !activeServerId) return;
    setLoading(true);
    setError("");

    // Sanitize channel name (lowercase, hyphens)
    const sanitized = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

    const channel = await createChannel(activeServerId, sanitized, description.trim() || undefined);
    if (channel) {
      setActiveChannel(channel.id);
      setActiveModal(null);
    } else {
      setError("Failed to create channel");
    }
    setLoading(false);
  }, [name, description, activeServerId, createChannel, setActiveChannel, setActiveModal]);

  return (
    <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Create Channel</div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Channel Name</label>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 16, marginRight: 4, color: "var(--berry-text-muted)" }}>#</span>
            <input
              className={styles.modalInput}
              style={{ flex: 1 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="new-channel"
              maxLength={100}
              autoFocus
            />
          </div>
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Description (optional)</label>
          <textarea
            className={styles.modalTextarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this channel about?"
            maxLength={500}
          />
        </div>

        {error && (
          <div style={{ color: "var(--berry-error, #dc3545)", fontSize: 12, marginBottom: 8 }}>
            {error}
          </div>
        )}

        <div className={styles.modalActions}>
          <button className={styles.modalButtonSecondary} onClick={() => setActiveModal(null)}>
            Cancel
          </button>
          <button
            className={styles.modalButtonPrimary}
            onClick={handleCreate}
            disabled={loading || !name.trim()}
          >
            {loading ? "Creating..." : "Create Channel"}
          </button>
        </div>
      </div>
    </div>
  );
}
