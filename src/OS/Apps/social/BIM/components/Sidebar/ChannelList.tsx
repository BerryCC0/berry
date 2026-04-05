/**
 * ChannelList — Channel sidebar for a selected server
 */

"use client";

import { useEffect } from "react";
import { useBimStore } from "../../store/bimStore";
import { useServers } from "../../hooks/useServers";
import type { BimServerData, BimChannelData } from "../../types";
import { hasPermission } from "../../utils";
import styles from "../../BIM.module.css";

interface ChannelListProps {
  server: BimServerData;
  channels: BimChannelData[];
  userRole: string;
}

export function ChannelList({ server, channels, userRole }: ChannelListProps) {
  const {
    activeChannelId,
    setActiveChannel,
    setActiveModal,
    unreadCounts,
  } = useBimStore();
  const { fetchChannels } = useServers();

  // Load channels when server changes
  useEffect(() => {
    fetchChannels(server.id);
  }, [server.id, fetchChannels]);

  // Auto-select first channel if none selected
  useEffect(() => {
    if (!activeChannelId && channels.length > 0) {
      const defaultChannel = channels.find((c) => c.is_default) ?? channels[0];
      setActiveChannel(defaultChannel.id);
    }
  }, [activeChannelId, channels, setActiveChannel]);

  return (
    <div className={styles.channelSidebar}>
      <div className={styles.channelSidebarHeader}>
        <span className={styles.channelSidebarHeaderTitle}>{server.name}</span>
        {hasPermission(userRole, "admin") && (
          <button
            className={styles.channelSidebarHeaderAction}
            onClick={() => setActiveModal("serverSettings")}
            title="Server Settings"
          >
            ⚙
          </button>
        )}
      </div>

      <div className={styles.channelList}>
        <div className={styles.channelCategory}>Text Channels</div>
        {channels.map((channel) => {
          const unread = unreadCounts[channel.xmtp_group_id ?? channel.id] ?? 0;
          return (
            <div
              key={channel.id}
              className={`${styles.channelItem} ${activeChannelId === channel.id ? styles.channelItemActive : ""}`}
              onClick={() => setActiveChannel(channel.id)}
            >
              <span className={styles.channelHash}>#</span>
              <span className={styles.channelName}>{channel.name}</span>
              {unread > 0 && activeChannelId !== channel.id && (
                <span className={styles.channelUnread}>{unread}</span>
              )}
            </div>
          );
        })}

        {hasPermission(userRole, "admin") && (
          <div
            className={styles.channelItem}
            onClick={() => setActiveModal("createChannel")}
            style={{ opacity: 0.6 }}
          >
            <span className={styles.channelHash}>+</span>
            <span className={styles.channelName}>Add Channel</span>
          </div>
        )}
      </div>
    </div>
  );
}
