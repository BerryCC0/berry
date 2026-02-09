/**
 * ServerRail — Vertical server icon strip (leftmost column)
 */

"use client";

import { useBimStore } from "../../store/bimStore";
import type { BimServerData } from "../../types";
import { getInitials, addressToColor, truncateAddress } from "../../utils";
import styles from "../../BIM.module.css";

interface ServerRailProps {
  servers: BimServerData[];
}

export function ServerRail({ servers }: ServerRailProps) {
  const {
    activeView,
    activeServerId,
    setActiveView,
    setActiveServer,
    setActiveModal,
    myProfile,
  } = useBimStore();

  const profileName = myProfile?.display_name ?? null;
  const profileAvatar = myProfile?.avatar_url ?? null;
  const profileWallet = myProfile?.wallet_address ?? "";
  const profileColor = addressToColor(profileWallet);

  return (
    <div className={styles.serverRail}>
      {/* DM button */}
      <button
        className={`${styles.serverIcon} ${styles.dmIcon} ${activeView === "dm" ? styles.serverIconActive : ""}`}
        onClick={() => setActiveView("dm")}
        title="Direct Messages"
      >
        ✉
      </button>

      <div className={styles.serverRailDivider} />

      {/* Server icons */}
      {servers.map((server) => (
        <button
          key={server.id}
          className={`${styles.serverIcon} ${activeServerId === server.id && activeView === "server" ? styles.serverIconActive : ""}`}
          onClick={() => {
            setActiveView("server");
            setActiveServer(server.id);
          }}
          title={server.name}
        >
          {server.icon_url ? (
            <img src={server.icon_url} alt={server.name} className={styles.serverIconImage} />
          ) : (
            <span>{getInitials(server.name, server.owner_address)}</span>
          )}
        </button>
      ))}

      <div className={styles.serverRailDivider} />

      {/* Add server button */}
      <button
        className={`${styles.serverIcon} ${styles.addServerIcon}`}
        onClick={() => setActiveModal("createServer")}
        title="Create or Join Server"
      >
        +
      </button>

      {/* Spacer to push user panel to the bottom */}
      <div style={{ flex: 1 }} />

      {/* User panel */}
      {profileWallet && (
        <button
          className={styles.userPanelButton}
          onClick={() => setActiveModal("userProfile")}
          title={profileName ?? truncateAddress(profileWallet, 4)}
        >
          {profileAvatar ? (
            <img
              src={profileAvatar}
              alt="Me"
              className={styles.userPanelAvatar}
            />
          ) : (
            <div
              className={styles.userPanelAvatar}
              style={{ background: profileColor }}
            >
              {getInitials(profileName, profileWallet)}
            </div>
          )}
        </button>
      )}
    </div>
  );
}
