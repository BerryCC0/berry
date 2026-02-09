/**
 * BIM (Berry Instant Messaging) — Shared types
 */

// ============================================================================
// Route types (URL-based navigation)
// ============================================================================

export type BimView = "server" | "dm";

export type BimRoute =
  | { view: "dm"; conversationId?: string }
  | { view: "server"; serverId: string; channelId?: string };

export function parseBimRoute(path?: string): BimRoute {
  if (!path) return { view: "dm" };
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return { view: "dm" };

  if (parts[0] === "dm") {
    return { view: "dm", conversationId: parts[1] };
  }

  if (parts[0] === "server" && parts[1]) {
    return { view: "server", serverId: parts[1], channelId: parts[2] };
  }

  return { view: "dm" };
}

export function bimRouteToPath(route: BimRoute): string {
  if (route.view === "dm") {
    return route.conversationId ? `dm/${route.conversationId}` : "dm";
  }
  let path = `server/${route.serverId}`;
  if (route.channelId) path += `/${route.channelId}`;
  return path;
}

// ============================================================================
// Server & Channel types (from our DB)
// ============================================================================

export interface BimServerData {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  owner_address: string;
  invite_code: string | null;
  is_token_gated: boolean;
  created_at: string;
}

export interface BimChannelData {
  id: string;
  server_id: string;
  name: string;
  description: string | null;
  xmtp_group_id: string | null;
  position: number;
  is_default: boolean;
  created_at: string;
}

export interface BimMemberData {
  server_id: string;
  wallet_address: string;
  role: "owner" | "admin" | "member";
  nickname: string | null;
  joined_at: string;
  // Enriched from profile
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface BimProfileData {
  wallet_address: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string | null;
  xmtp_inbox_id: string | null;
}

// ============================================================================
// Message types (from XMTP, normalized for our UI)
// ============================================================================

export interface BimMessage {
  id: string;
  conversationId: string;
  senderAddress: string;
  senderInboxId: string;
  content: string;
  contentType: BimContentType;
  sentAt: number; // unix ms
  // Rich content
  replyToMessageId?: string;
  reactions?: BimReaction[];
  attachment?: BimAttachment;
}

export type BimContentType = "text" | "reaction" | "reply" | "attachment" | "readReceipt" | "unknown";

export interface BimReaction {
  emoji: string;
  senderAddress: string;
  action: "added" | "removed";
}

export interface BimAttachment {
  filename: string;
  mimeType: string;
  url: string;
  size?: number;
}

// ============================================================================
// DM types
// ============================================================================

export interface BimDmConversation {
  id: string; // XMTP conversation ID
  peerAddress: string;
  peerInboxId: string;
  lastMessage?: string;
  lastMessageAt?: number;
  unreadCount: number;
}

// ============================================================================
// UI State types
// ============================================================================

export interface BimInitialState {
  path?: string;
}

export type ModalType =
  | "createServer"
  | "createChannel"
  | "serverSettings"
  | "inviteMembers"
  | "userProfile"
  | null;
