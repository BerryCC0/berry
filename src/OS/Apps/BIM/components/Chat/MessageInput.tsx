/**
 * MessageInput — Message composition area
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useBimStore } from "../../store/bimStore";
import { truncateAddress } from "../../utils";
import styles from "../../BIM.module.css";

interface MessageInputProps {
  onSend: (text: string) => void;
  onSendReply?: (text: string, replyToId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({ onSend, onSendReply, placeholder, disabled }: MessageInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { replyingTo, setReplyingTo } = useBimStore();

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  }, [text]);

  // Focus on reply
  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);

  const handleSend = useCallback(() => {
    if (!text.trim() || disabled) return;

    if (replyingTo && onSendReply) {
      onSendReply(text.trim(), replyingTo.id);
    } else {
      onSend(text.trim());
    }

    setText("");
    setReplyingTo(null);
  }, [text, disabled, replyingTo, onSend, onSendReply, setReplyingTo]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === "Escape" && replyingTo) {
        setReplyingTo(null);
      }
    },
    [handleSend, replyingTo, setReplyingTo]
  );

  return (
    <div className={styles.messageInputContainer}>
      {/* Reply preview */}
      {replyingTo && (
        <div className={styles.messageInputReply}>
          <span>Replying to <strong>{truncateAddress(replyingTo.senderAddress, 4)}</strong></span>
          <button
            className={styles.messageInputReplyClose}
            onClick={() => setReplyingTo(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div className={styles.messageInputWrapper}>
        <textarea
          ref={textareaRef}
          className={styles.messageInput}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Type a message..."}
          disabled={disabled}
          rows={1}
        />
        <button
          className={styles.messageInputSendButton}
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          title="Send (Enter)"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
