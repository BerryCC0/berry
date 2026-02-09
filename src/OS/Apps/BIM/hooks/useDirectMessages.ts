/**
 * useDirectMessages — DM conversation management
 */

"use client";

import { useEffect, useCallback, useRef } from "react";
import type { AsyncStreamProxy, DecodedMessage } from "@xmtp/browser-sdk";
import { IdentifierKind } from "@xmtp/wasm-bindings";
import { getXmtpClient } from "./useXmtpClient";
import { useBimStore } from "../store/bimStore";
import { normalizeMessage } from "../lib/contentTypes";
import type { BimDmConversation } from "../types";

export function useDirectMessages() {
  const {
    dmConversations,
    setDmConversations,
    addDmConversation,
    updateDmConversation,
    isXmtpReady,
    incrementUnread,
    activeDmConversationId,
  } = useBimStore();

  const streamRef = useRef<AsyncStreamProxy<DecodedMessage> | null>(null);

  // Load all DM conversations
  const loadConversations = useCallback(async () => {
    const client = getXmtpClient();
    if (!client || !isXmtpReady) return;

    try {
      await client.conversations.sync();
      const convos = await client.conversations.listDms();

      const dms: BimDmConversation[] = [];
      for (const convo of convos) {
        try {
          const peerInboxId = await convo.peerInboxId();
          const lastMsg = await convo.lastMessage();
          const lastContent = lastMsg
            ? normalizeMessage(lastMsg, convo.id)
            : null;

          dms.push({
            id: convo.id,
            peerAddress: peerInboxId, // We use inbox ID as peer identifier
            peerInboxId: peerInboxId,
            lastMessage: lastContent?.content,
            lastMessageAt: lastContent?.sentAt,
            unreadCount: 0,
          });
        } catch {
          // Skip problematic conversations
        }
      }

      // Sort by last message time
      dms.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));
      setDmConversations(dms);
    } catch (err) {
      console.error("[BIM] Failed to load DM conversations:", err);
    }
  }, [isXmtpReady, setDmConversations]);

  // Stream all conversations for new messages
  useEffect(() => {
    const client = getXmtpClient();
    if (!client || !isXmtpReady) return;

    let cancelled = false;

    const startStream = async () => {
      try {
        const stream = await client.conversations.streamAllMessages();
        streamRef.current = stream;

        for await (const msg of stream) {
          if (cancelled) break;
          const convId = msg.conversationId;
          const norm = normalizeMessage(msg, convId);
          if (norm && norm.contentType !== "reaction" && norm.contentType !== "readReceipt") {
            // Update DM last message
            updateDmConversation(convId, {
              lastMessage: norm.content,
              lastMessageAt: norm.sentAt,
            });

            // Increment unread if not the active conversation
            if (convId !== activeDmConversationId) {
              incrementUnread(convId);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[BIM] DM stream error:", err);
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
  }, [isXmtpReady, activeDmConversationId, updateDmConversation, incrementUnread]);

  // Load on mount
  useEffect(() => {
    if (isXmtpReady) {
      loadConversations();
    }
  }, [isXmtpReady, loadConversations]);

  // Create a new DM
  const createDm = useCallback(async (peerAddress: string): Promise<string | null> => {
    const client = getXmtpClient();
    if (!client) return null;

    try {
      const identifier = {
        identifier: peerAddress,
        identifierKind: IdentifierKind.Ethereum,
      };

      // Check if can message
      const canMessage = await client.canMessage([identifier]);
      if (!canMessage.get(peerAddress)) {
        console.warn("[BIM] Peer is not on XMTP:", peerAddress);
        return null;
      }

      const convo = await client.conversations.createDmWithIdentifier(identifier);
      const newDm: BimDmConversation = {
        id: convo.id,
        peerAddress,
        peerInboxId: "",
        unreadCount: 0,
      };
      addDmConversation(newDm);
      return convo.id;
    } catch (err) {
      console.error("[BIM] Failed to create DM:", err);
      return null;
    }
  }, [addDmConversation]);

  return {
    dmConversations,
    loadConversations,
    createDm,
  };
}
