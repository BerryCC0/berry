/**
 * UserProfile — Profile editing modal
 */

"use client";

import { useState, useEffect } from "react";
import { useBimStore } from "../../store/bimStore";
import { useProfile } from "../../hooks/useProfile";
import { addressToColor, getInitials, truncateAddress } from "../../utils";
import styles from "../../BIM.module.css";

export function UserProfile() {
  const { setActiveModal } = useBimStore();
  const { myProfile, updateProfile } = useProfile();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Populate form when profile loads
  useEffect(() => {
    if (myProfile) {
      setDisplayName(myProfile.display_name ?? "");
      setAvatarUrl(myProfile.avatar_url ?? "");
      setStatus(myProfile.status ?? "");
    }
  }, [myProfile]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await updateProfile({
      display_name: displayName.trim() || undefined,
      avatar_url: avatarUrl.trim() || undefined,
      status: status.trim() || undefined,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const walletAddress = myProfile?.wallet_address ?? "";
  const color = addressToColor(walletAddress);
  const previewName = displayName.trim() || null;

  return (
    <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Edit Profile</div>

        {/* Avatar preview */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          {avatarUrl.trim() ? (
            <img
              src={avatarUrl.trim()}
              alt="Avatar"
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                objectFit: "cover",
                border: `2px solid ${color}`,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {getInitials(previewName, walletAddress)}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {previewName ?? truncateAddress(walletAddress, 6)}
            </div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>
              {truncateAddress(walletAddress, 6)}
            </div>
            {myProfile?.status && (
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                {myProfile.status}
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Display Name</label>
          <input
            className={styles.modalInput}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter a display name..."
            maxLength={50}
            autoFocus
          />
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>
            This is how other users will see you in BIM
          </div>
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Avatar URL</label>
          <input
            className={styles.modalInput}
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.png"
          />
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>
            ENS avatar is used by default if available
          </div>
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Status</label>
          <input
            className={styles.modalInput}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="What are you up to?"
            maxLength={128}
          />
        </div>

        {saved && (
          <div style={{ color: "var(--berry-success, #28a745)", fontSize: 12, marginBottom: 8 }}>
            Profile saved!
          </div>
        )}

        <div className={styles.modalActions}>
          <button className={styles.modalButtonSecondary} onClick={() => setActiveModal(null)}>
            Close
          </button>
          <button
            className={styles.modalButtonPrimary}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
