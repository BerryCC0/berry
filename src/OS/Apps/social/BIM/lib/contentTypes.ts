/**
 * XMTP Content Type Helpers
 * Normalize XMTP messages into our BimMessage format
 */

import type { DecodedMessage } from "@xmtp/browser-sdk";
import { isText, isReaction, isReply, isTextReply, isAttachment, isRemoteAttachment, isReadReceipt } from "@xmtp/browser-sdk";
import type { BimMessage, BimContentType } from "../types";

/**
 * Normalize an XMTP decoded message into our BimMessage format
 */
export function normalizeMessage(
  decodedMessage: DecodedMessage,
  conversationId: string,
): BimMessage | null {
  try {
    // Skip read receipts
    if (isReadReceipt(decodedMessage)) return null;

    const sentAt = decodedMessage.sentAt
      ? decodedMessage.sentAt.getTime()
      : Date.now();

    // Handle reaction messages
    if (isReaction(decodedMessage)) {
      const reaction = decodedMessage.content;
      return {
        id: decodedMessage.id,
        conversationId,
        senderAddress: decodedMessage.senderInboxId ?? "",
        senderInboxId: decodedMessage.senderInboxId ?? "",
        content: reaction?.content ?? "👍",
        contentType: "reaction",
        sentAt,
        replyToMessageId: reaction?.reference,
      };
    }

    // Handle reply messages
    if (isTextReply(decodedMessage)) {
      const reply = decodedMessage.content;
      return {
        id: decodedMessage.id,
        conversationId,
        senderAddress: decodedMessage.senderInboxId ?? "",
        senderInboxId: decodedMessage.senderInboxId ?? "",
        content: typeof reply?.content === "string" ? reply.content : "",
        contentType: "reply",
        sentAt,
        replyToMessageId: reply?.referenceId,
      };
    }

    if (isReply(decodedMessage)) {
      const reply = decodedMessage.content;
      return {
        id: decodedMessage.id,
        conversationId,
        senderAddress: decodedMessage.senderInboxId ?? "",
        senderInboxId: decodedMessage.senderInboxId ?? "",
        content: typeof reply?.content === "string" ? reply.content : String(reply?.content ?? ""),
        contentType: "reply",
        sentAt,
        replyToMessageId: reply?.referenceId,
      };
    }

    // Handle attachment messages
    if (isRemoteAttachment(decodedMessage)) {
      const attachment = decodedMessage.content;
      return {
        id: decodedMessage.id,
        conversationId,
        senderAddress: decodedMessage.senderInboxId ?? "",
        senderInboxId: decodedMessage.senderInboxId ?? "",
        content: attachment?.filename ?? "Attachment",
        contentType: "attachment",
        sentAt,
        attachment: {
          filename: attachment?.filename ?? "file",
          mimeType: "application/octet-stream",
          url: attachment?.url ?? "",
          size: attachment?.contentLength,
        },
      };
    }

    if (isAttachment(decodedMessage)) {
      const attachment = decodedMessage.content;
      return {
        id: decodedMessage.id,
        conversationId,
        senderAddress: decodedMessage.senderInboxId ?? "",
        senderInboxId: decodedMessage.senderInboxId ?? "",
        content: attachment?.filename ?? "Attachment",
        contentType: "attachment",
        sentAt,
      };
    }

    // Default: text message
    if (isText(decodedMessage)) {
      return {
        id: decodedMessage.id,
        conversationId,
        senderAddress: decodedMessage.senderInboxId ?? "",
        senderInboxId: decodedMessage.senderInboxId ?? "",
        content: decodedMessage.content ?? "",
        contentType: "text",
        sentAt,
      };
    }

    // Unknown content type - try to stringify
    return {
      id: decodedMessage.id,
      conversationId,
      senderAddress: decodedMessage.senderInboxId ?? "",
      senderInboxId: decodedMessage.senderInboxId ?? "",
      content: decodedMessage.fallback ?? String(decodedMessage.content ?? ""),
      contentType: "text",
      sentAt,
    };
  } catch {
    return null;
  }
}

/**
 * Determine our content type from XMTP content type
 */
export function getContentType(msg: DecodedMessage): BimContentType {
  if (isText(msg)) return "text";
  if (isReaction(msg)) return "reaction";
  if (isReply(msg) || isTextReply(msg)) return "reply";
  if (isAttachment(msg) || isRemoteAttachment(msg)) return "attachment";
  if (isReadReceipt(msg)) return "readReceipt";
  return "unknown";
}
