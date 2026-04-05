/**
 * CreateServer — Create or join a server modal
 */

"use client";

import { useState, useCallback } from "react";
import { useBimStore } from "../../store/bimStore";
import { useServers } from "../../hooks/useServers";
import styles from "../../BIM.module.css";

export function CreateServer() {
  const { setActiveModal, setActiveView, setActiveServer } = useBimStore();
  const { createServer, joinServer } = useServers();

  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    const server = await createServer(name.trim(), description.trim() || undefined);
    if (server) {
      setActiveView("server");
      setActiveServer(server.id);
      setActiveModal(null);
    } else {
      setError("Failed to create server");
    }
    setLoading(false);
  }, [name, description, createServer, setActiveView, setActiveServer, setActiveModal]);

  const handleJoin = useCallback(async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError("");
    const server = await joinServer(inviteCode.trim());
    if (server) {
      setActiveView("server");
      setActiveServer(server.id);
      setActiveModal(null);
    } else {
      setError("Invalid invite code or server not found");
    }
    setLoading(false);
  }, [inviteCode, joinServer, setActiveView, setActiveServer, setActiveModal]);

  return (
    <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>
          {mode === "create" ? "Create a Server" : "Join a Server"}
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            className={mode === "create" ? styles.modalButtonPrimary : styles.modalButtonSecondary}
            onClick={() => { setMode("create"); setError(""); }}
          >
            Create
          </button>
          <button
            className={mode === "join" ? styles.modalButtonPrimary : styles.modalButtonSecondary}
            onClick={() => { setMode("join"); setError(""); }}
          >
            Join
          </button>
        </div>

        {mode === "create" ? (
          <>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Server Name</label>
              <input
                className={styles.modalInput}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Server"
                maxLength={100}
                autoFocus
              />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Description (optional)</label>
              <textarea
                className={styles.modalTextarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this server about?"
                maxLength={500}
              />
            </div>
          </>
        ) : (
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Invite Code</label>
            <input
              className={styles.modalInput}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code..."
              maxLength={20}
              autoFocus
            />
          </div>
        )}

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
            onClick={mode === "create" ? handleCreate : handleJoin}
            disabled={loading || (mode === "create" ? !name.trim() : !inviteCode.trim())}
          >
            {loading ? "..." : mode === "create" ? "Create Server" : "Join Server"}
          </button>
        </div>
      </div>
    </div>
  );
}
