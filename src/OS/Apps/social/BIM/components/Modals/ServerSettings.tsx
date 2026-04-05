/**
 * ServerSettings — Server settings and invite management
 */

"use client";

import { useState, useCallback } from "react";
import { useBimStore } from "../../store/bimStore";
import { useServers } from "../../hooks/useServers";
import styles from "../../BIM.module.css";

export function ServerSettings() {
  const { activeServerId, servers, setActiveModal, setActiveView } = useBimStore();
  const { deleteServer } = useServers();

  const server = servers.find((s) => s.id === activeServerId);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleCopyInvite = useCallback(async () => {
    if (!server?.invite_code) return;
    try {
      await navigator.clipboard.writeText(server.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = server.invite_code;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [server?.invite_code]);

  const handleDelete = useCallback(async () => {
    if (!activeServerId) return;
    const success = await deleteServer(activeServerId);
    if (success) {
      setActiveView("dm");
      setActiveModal(null);
    }
  }, [activeServerId, deleteServer, setActiveView, setActiveModal]);

  if (!server) return null;

  return (
    <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Server Settings</div>

        <div className={styles.settingSection}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Server Name</label>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{server.name}</div>
          </div>

          {server.description && (
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Description</label>
              <div style={{ fontSize: 13 }}>{server.description}</div>
            </div>
          )}
        </div>

        {/* Invite Code */}
        <div className={styles.settingSection}>
          <div className={styles.modalLabel} style={{ marginBottom: 8 }}>Invite Code</div>
          <div className={styles.inviteCode}>
            <span style={{ flex: 1 }}>{server.invite_code ?? "—"}</span>
            {server.invite_code && (
              <button className={styles.inviteCodeCopy} onClick={handleCopyInvite}>
                {copied ? "Copied!" : "Copy"}
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--berry-text-muted)", marginTop: 4 }}>
            Share this code with others so they can join your server.
          </div>
        </div>

        {/* Danger Zone */}
        <div className={styles.settingSection}>
          <div className={styles.modalLabel} style={{ marginBottom: 8, color: "var(--berry-error)" }}>
            Danger Zone
          </div>
          {!confirmDelete ? (
            <button className={styles.dangerButton} onClick={() => setConfirmDelete(true)}>
              Delete Server
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--berry-error)" }}>Are you sure?</span>
              <button className={styles.dangerButton} onClick={handleDelete}>
                Yes, Delete
              </button>
              <button className={styles.modalButtonSecondary} onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button className={styles.modalButtonSecondary} onClick={() => setActiveModal(null)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
