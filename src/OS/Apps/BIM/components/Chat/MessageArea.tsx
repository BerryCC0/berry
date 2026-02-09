/**
 * MessageArea — Scrollable message list with auto-scroll
 */

"use client";

import { useEffect, useRef } from "react";
import { useBimStore } from "../../store/bimStore";
import { useMessages } from "../../hooks/useMessages";
import { MessageItem } from "./MessageItem";
import { MessageInput } from "./MessageInput";
import {
  shouldGroupMessages,
  shouldShowDateSeparator,
  formatDateSeparator,
  truncateAddress,
} from "../../utils";
import type { BimMessage } from "../../types";
import styles from "../../BIM.module.css";

interface MessageAreaProps {
  conversationId: string | null;
  xmtpGroupId: string | null;
  channelName?: string;
  channelDescription?: string;
  isChannel?: boolean;
  memberAddresses?: string[];
}

export function MessageArea({
  conversationId,
  xmtpGroupId,
  channelName,
  channelDescription,
  isChannel,
  memberAddresses,
}: MessageAreaProps) {
  const { messages, sendMessage, sendReaction, sendReply, notInGroup } = useMessages(
    conversationId,
    xmtpGroupId,
    memberAddresses
  );
  const { setReplyingTo, showMemberList, toggleMemberList, toggleSearch } = useBimStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleReply = (message: BimMessage) => {
    setReplyingTo(message);
  };

  // Find reply content
  const getReplyContent = (messageId?: string) => {
    if (!messageId) return undefined;
    const msg = messages.find((m) => m.id === messageId);
    return msg?.content;
  };

  const getReplyySender = (messageId?: string) => {
    if (!messageId) return undefined;
    const msg = messages.find((m) => m.id === messageId);
    return msg ? truncateAddress(msg.senderAddress, 4) : undefined;
  };

  if (!conversationId) {
    return (
      <div className={styles.chatArea}>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>💬</div>
          <div className={styles.emptyStateTitle}>
            {isChannel ? "Select a channel" : "Select a conversation"}
          </div>
          <div className={styles.emptyStateText}>
            {isChannel
              ? "Choose a channel from the sidebar to start chatting"
              : "Select a conversation or start a new one"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chatArea}>
      {/* Chat header */}
      <div className={styles.chatHeader}>
        {isChannel && <span className={styles.chatHeaderHash}>#</span>}
        <span className={styles.chatHeaderName}>
          {channelName ?? truncateAddress(conversationId, 6)}
        </span>
        {channelDescription && (
          <span className={styles.chatHeaderDescription}>{channelDescription}</span>
        )}
        <div className={styles.chatHeaderActions}>
          <button
            className={`${styles.chatHeaderButton}`}
            onClick={toggleSearch}
            title="Search"
          >
            🔍
          </button>
          {isChannel && (
            <button
              className={`${styles.chatHeaderButton} ${showMemberList ? styles.chatHeaderButtonActive : ""}`}
              onClick={toggleMemberList}
              title="Toggle Members"
            >
              👥
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer} ref={containerRef}>
        {isChannel && notInGroup && xmtpGroupId && messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>🔄</div>
            <div className={styles.emptyStateTitle}>
              Waiting to be added to #{channelName ?? "channel"}
            </div>
            <div className={styles.emptyStateText}>
              An existing member needs to sync you into this channel.
              This happens automatically when they visit the channel.
            </div>
          </div>
        ) : messages.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>🎉</div>
            <div className={styles.emptyStateTitle}>
              {isChannel
                ? `Welcome to #${channelName ?? "channel"}`
                : "Start of conversation"}
            </div>
            <div className={styles.emptyStateText}>
              Send a message to get the conversation going!
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const prev = i > 0 ? messages[i - 1] : null;
          const isGrouped = prev
            ? shouldGroupMessages(prev.sentAt, prev.senderAddress, msg.sentAt, msg.senderAddress)
            : false;
          const showDate = prev
            ? shouldShowDateSeparator(prev.sentAt, msg.sentAt)
            : true;

          return (
            <MessageItem
              key={msg.id}
              message={msg}
              isGrouped={isGrouped && !showDate}
              showDateSeparator={showDate}
              dateSeparatorText={showDate ? formatDateSeparator(msg.sentAt) : undefined}
              onReply={handleReply}
              onReact={sendReaction}
              replyToContent={getReplyContent(msg.replyToMessageId)}
              replyToSender={getReplyySender(msg.replyToMessageId)}
            />
          );
        })}
        <div ref={messagesEndRef} className={styles.messagesEnd} />
      </div>

      {/* Input */}
      <MessageInput
        onSend={sendMessage}
        onSendReply={sendReply}
        placeholder={
          isChannel
            ? `Message #${channelName ?? "channel"}`
            : "Type a message..."
        }
      />
    </div>
  );
}
