/**
 * MessageItem — Single message display
 */

"use client";

import type { BimMessage } from "../../types";
import {
  formatMessageTime,
  addressToColor,
  getInitials,
  truncateAddress,
} from "../../utils";
import styles from "../../BIM.module.css";

interface MessageItemProps {
  message: BimMessage;
  isGrouped: boolean;
  showDateSeparator: boolean;
  dateSeparatorText?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  resolvedAddress?: string;
  onReply?: (message: BimMessage) => void;
  onReact?: (messageId: string, emoji: string) => void;
  replyToContent?: string;
  replyToSender?: string;
}

export function MessageItem({
  message,
  isGrouped,
  showDateSeparator,
  dateSeparatorText,
  displayName,
  avatarUrl,
  resolvedAddress,
  onReply,
  onReact,
  replyToContent,
  replyToSender,
}: MessageItemProps) {
  const effectiveAddress = resolvedAddress ?? message.senderAddress;
  const senderDisplay = displayName ?? truncateAddress(effectiveAddress, 4);
  const color = addressToColor(effectiveAddress);
  const time = formatMessageTime(message.sentAt);
  const shortTime = new Date(message.sentAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <>
      {showDateSeparator && dateSeparatorText && (
        <div className={styles.dateSeparator}>
          <div className={styles.dateSeparatorLine} />
          <span>{dateSeparatorText}</span>
          <div className={styles.dateSeparatorLine} />
        </div>
      )}

      {isGrouped ? (
        <div className={`${styles.messageGroup} ${styles.messageGrouped}`}>
          <div className={styles.messageGroupedRow}>
            <span className={styles.messageGroupedTimestamp}>{shortTime}</span>
            <div className={styles.messageContent}>
              {/* Reply indicator */}
              {message.replyToMessageId && replyToContent && (
                <div className={styles.replyPreview}>
                  <div className={styles.replyBar} />
                  {replyToSender && <span className={styles.replySender}>{replyToSender}</span>}
                  <span className={styles.replyText}>{replyToContent}</span>
                </div>
              )}
              {/* Attachment */}
              {message.contentType === "attachment" && message.attachment && (
                <div className={styles.attachmentPreview}>
                  {message.attachment.mimeType.startsWith("image/") ? (
                    <img
                      src={message.attachment.url}
                      alt={message.attachment.filename}
                      className={styles.attachmentImage}
                    />
                  ) : (
                    <div className={styles.attachmentFile}>
                      <span className={styles.attachmentFileIcon}>📎</span>
                      <div>
                        <div className={styles.attachmentFileName}>{message.attachment.filename}</div>
                        {message.attachment.size && (
                          <div className={styles.attachmentFileSize}>
                            {(message.attachment.size / 1024).toFixed(1)} KB
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Text content */}
              {message.contentType !== "attachment" && (
                <div className={styles.messageText}>{message.content}</div>
              )}
              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className={styles.reactionsRow}>
                  {groupReactions(message.reactions).map(([emoji, count]) => (
                    <button
                      key={emoji}
                      className={styles.reactionBadge}
                      onClick={() => onReact?.(message.id, emoji)}
                    >
                      <span>{emoji}</span>
                      <span className={styles.reactionCount}>{count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.messageGroup}>
          <div className={styles.messageRow}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={senderDisplay}
                className={styles.messageAvatar}
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div
                className={styles.messageAvatar}
                style={{ background: color }}
              >
                {getInitials(displayName ?? null, effectiveAddress)}
              </div>
            )}
            <div className={styles.messageContent}>
              <div className={styles.messageHeader}>
                <span className={styles.messageSender} style={{ color }}>
                  {senderDisplay}
                </span>
                <span className={styles.messageTimestamp}>{time}</span>
              </div>
              {/* Reply indicator */}
              {message.replyToMessageId && replyToContent && (
                <div className={styles.replyPreview}>
                  <div className={styles.replyBar} />
                  {replyToSender && <span className={styles.replySender}>{replyToSender}</span>}
                  <span className={styles.replyText}>{replyToContent}</span>
                </div>
              )}
              {/* Attachment */}
              {message.contentType === "attachment" && message.attachment && (
                <div className={styles.attachmentPreview}>
                  {message.attachment.mimeType.startsWith("image/") ? (
                    <img
                      src={message.attachment.url}
                      alt={message.attachment.filename}
                      className={styles.attachmentImage}
                    />
                  ) : (
                    <div className={styles.attachmentFile}>
                      <span className={styles.attachmentFileIcon}>📎</span>
                      <div>
                        <div className={styles.attachmentFileName}>{message.attachment.filename}</div>
                        {message.attachment.size && (
                          <div className={styles.attachmentFileSize}>
                            {(message.attachment.size / 1024).toFixed(1)} KB
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Text */}
              {message.contentType !== "attachment" && (
                <div className={styles.messageText}>{message.content}</div>
              )}
              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className={styles.reactionsRow}>
                  {groupReactions(message.reactions).map(([emoji, count]) => (
                    <button
                      key={emoji}
                      className={styles.reactionBadge}
                      onClick={() => onReact?.(message.id, emoji)}
                    >
                      <span>{emoji}</span>
                      <span className={styles.reactionCount}>{count}</span>
                    </button>
                  ))}
                  <button
                    className={styles.addReactionButton}
                    onClick={() => onReact?.(message.id, "👍")}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Action bar on hover */}
          <div className={styles.reactionsRow} style={{ paddingLeft: 44, marginTop: 0 }}>
            <button
              className={styles.addReactionButton}
              onClick={() => onReact?.(message.id, "👍")}
              title="Add Reaction"
              style={{ opacity: undefined }}
            >
              😀
            </button>
            <button
              className={styles.addReactionButton}
              onClick={() => onReply?.(message)}
              title="Reply"
              style={{ opacity: undefined }}
            >
              ↩
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function groupReactions(reactions: { emoji: string; action: string }[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const r of reactions) {
    if (r.action === "added") {
      counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
    } else if (r.action === "removed") {
      const current = counts.get(r.emoji) ?? 0;
      if (current > 1) counts.set(r.emoji, current - 1);
      else counts.delete(r.emoji);
    }
  }
  return Array.from(counts.entries());
}
