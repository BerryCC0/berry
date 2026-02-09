/**
 * useMessages — Message management for active conversation
 */

"use client";

import { useEffect, useCallback, useRef } from "react";
import type { AsyncStreamProxy, DecodedMessage } from "@xmtp/browser-sdk";
import { encodeText } from "@xmtp/browser-sdk";
import { ReactionAction, ReactionSchema } from "@xmtp/wasm-bindings";
import { getXmtpClient } from "./useXmtpClient";
import { useBimStore } from "../store/bimStore";
import { normalizeMessage } from "../lib/contentTypes";
import type { BimMessage } from "../types";

export function useMessages(conversationId: string | null, xmtpGroupId: string | null) {
  const {
    messages,
    addMessage,
    setMessages,
    isXmtpReady,
    clearUnread,
  } = useBimStore();

  const streamRef = useRef<AsyncStreamProxy<DecodedMessage> | null>(null);

  const currentMessages = conversationId ? (messages[conversationId] ?? []) : [];

  // Load message history when conversation changes
  const loadHistory = useCallback(async () => {
    if (!xmtpGroupId || !conversationId || !isXmtpReady) return;
    const client = getXmtpClient();
    if (!client) return;

    try {
      const conversation = await client.conversations.getConversationById(xmtpGroupId);
      if (!conversation) return;

      await conversation.sync();
      const xmtpMessages = await conversation.messages();

      const normalized: BimMessage[] = [];
      for (const msg of xmtpMessages) {
        const norm = normalizeMessage(msg, conversationId);
        if (norm && norm.contentType !== "reaction") {
          normalized.push(norm);
        }
      }

      // Sort by time
      normalized.sort((a, b) => a.sentAt - b.sentAt);
      setMessages(conversationId, normalized);
      clearUnread(conversationId);
    } catch (err) {
      console.error("[BIM] Failed to load messages:", err);
    }
  }, [xmtpGroupId, conversationId, isXmtpReady, setMessages, clearUnread]);

  // Stream new messages
  useEffect(() => {
    if (!xmtpGroupId || !conversationId || !isXmtpReady) return;
    const client = getXmtpClient();
    if (!client) return;

    let cancelled = false;

    const startStream = async () => {
      try {
        const conversation = await client.conversations.getConversationById(xmtpGroupId);
        if (!conversation || cancelled) return;

        const stream = await conversation.stream();
        streamRef.current = stream;

        for await (const msg of stream) {
          if (cancelled) break;
          const norm = normalizeMessage(msg, conversationId);
          if (norm && norm.contentType !== "reaction") {
            addMessage(conversationId, norm);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[BIM] Message stream error:", err);
        }
      }
    };

    startStream();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.return().catch(() => {});
        streamRef.current = null;
      }
    };
  }, [xmtpGroupId, conversationId, isXmtpReady, addMessage]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Send a text message
  const sendMessage = useCallback(async (text: string) => {
    if (!xmtpGroupId || !text.trim()) return;
    const client = getXmtpClient();
    if (!client) return;

    try {
      const conversation = await client.conversations.getConversationById(xmtpGroupId);
      if (!conversation) return;

      await conversation.sendText(text.trim());
    } catch (err) {
      console.error("[BIM] Failed to send message:", err);
    }
  }, [xmtpGroupId]);

  // Send a reaction
  const sendReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!xmtpGroupId) return;
    const client = getXmtpClient();
    if (!client) return;

    try {
      const conversation = await client.conversations.getConversationById(xmtpGroupId);
      if (!conversation) return;

      await conversation.sendReaction({
        reference: messageId,
        referenceInboxId: "",
        action: ReactionAction.Added,
        content: emoji,
        schema: ReactionSchema.Unicode,
      });
    } catch (err) {
      console.error("[BIM] Failed to send reaction:", err);
    }
  }, [xmtpGroupId]);

  // Send a reply
  const sendReply = useCallback(async (text: string, replyToId: string) => {
    if (!xmtpGroupId || !text.trim()) return;
    const client = getXmtpClient();
    if (!client) return;

    try {
      const conversation = await client.conversations.getConversationById(xmtpGroupId);
      if (!conversation) return;

      const encodedContent = await encodeText(text.trim());
      await conversation.sendReply({
        reference: replyToId,
        content: encodedContent,
      });
    } catch (err) {
      console.error("[BIM] Failed to send reply:", err);
    }
  }, [xmtpGroupId]);

  return {
    messages: currentMessages,
    sendMessage,
    sendReaction,
    sendReply,
    loadHistory,
  };
}
