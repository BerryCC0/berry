/**
 * ServerRail — Vertical server icon strip (leftmost column)
 */

"use client";

import { useBimStore } from "../../store/bimStore";
import type { BimServerData } from "../../types";
import { getInitials, addressToColor } from "../../utils";
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
  } = useBimStore();

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
    </div>
  );
}
