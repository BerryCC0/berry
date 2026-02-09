/**
 * BIM Zustand Store
 * Central state management for the BIM chat app
 */

import { create } from "zustand";
import type {
  BimServerData,
  BimChannelData,
  BimMemberData,
  BimMessage,
  BimDmConversation,
  ModalType,
} from "../types";

interface BIMStore {
  // ── XMTP Client State ────────────────────────────────────
  isXmtpReady: boolean;
  isXmtpConnecting: boolean;
  xmtpError: string | null;
  inboxId: string | null;

  setXmtpReady: (ready: boolean) => void;
  setXmtpConnecting: (connecting: boolean) => void;
  setXmtpError: (error: string | null) => void;
  setInboxId: (id: string | null) => void;

  // ── Navigation ───────────────────────────────────────────
  activeView: "server" | "dm";
  activeServerId: string | null;
  activeChannelId: string | null;
  activeDmConversationId: string | null;

  setActiveView: (view: "server" | "dm") => void;
  setActiveServer: (serverId: string | null) => void;
  setActiveChannel: (channelId: string | null) => void;
  setActiveDmConversation: (conversationId: string | null) => void;

  // ── Servers ──────────────────────────────────────────────
  servers: BimServerData[];
  setServers: (servers: BimServerData[]) => void;
  addServer: (server: BimServerData) => void;
  removeServer: (serverId: string) => void;
  updateServerData: (serverId: string, data: Partial<BimServerData>) => void;

  // ── Channels ─────────────────────────────────────────────
  channels: Record<string, BimChannelData[]>; // serverId -> channels
  setChannels: (serverId: string, channels: BimChannelData[]) => void;
  addChannel: (serverId: string, channel: BimChannelData) => void;
  removeChannel: (serverId: string, channelId: string) => void;

  // ── Members ──────────────────────────────────────────────
  members: Record<string, BimMemberData[]>; // serverId -> members
  setMembers: (serverId: string, members: BimMemberData[]) => void;
  addMember: (serverId: string, member: BimMemberData) => void;
  removeMember: (serverId: string, walletAddress: string) => void;

  // ── Messages ─────────────────────────────────────────────
  messages: Record<string, BimMessage[]>; // conversationId (xmtp_group_id or dm_id) -> messages
  addMessage: (conversationId: string, message: BimMessage) => void;
  setMessages: (conversationId: string, messages: BimMessage[]) => void;
  prependMessages: (conversationId: string, messages: BimMessage[]) => void;

  // ── DMs ──────────────────────────────────────────────────
  dmConversations: BimDmConversation[];
  setDmConversations: (dms: BimDmConversation[]) => void;
  addDmConversation: (dm: BimDmConversation) => void;
  updateDmConversation: (id: string, data: Partial<BimDmConversation>) => void;

  // ── Unread Counts ────────────────────────────────────────
  unreadCounts: Record<string, number>; // conversationId -> count
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;

  // ── UI State ─────────────────────────────────────────────
  activeModal: ModalType;
  setActiveModal: (modal: ModalType) => void;
  showMemberList: boolean;
  toggleMemberList: () => void;
  showSearch: boolean;
  toggleSearch: () => void;

  // ── Reply State ──────────────────────────────────────────
  replyingTo: BimMessage | null;
  setReplyingTo: (message: BimMessage | null) => void;

  // ── Reset ────────────────────────────────────────────────
  reset: () => void;
}

const initialState = {
  isXmtpReady: false,
  isXmtpConnecting: false,
  xmtpError: null,
  inboxId: null,

  activeView: "dm" as const,
  activeServerId: null,
  activeChannelId: null,
  activeDmConversationId: null,

  servers: [],
  channels: {},
  members: {},
  messages: {},
  dmConversations: [],
  unreadCounts: {},

  activeModal: null,
  showMemberList: true,
  showSearch: false,
  replyingTo: null,
};

export const useBimStore = create<BIMStore>((set) => ({
  ...initialState,

  // XMTP Client
  setXmtpReady: (ready) => set({ isXmtpReady: ready }),
  setXmtpConnecting: (connecting) => set({ isXmtpConnecting: connecting }),
  setXmtpError: (error) => set({ xmtpError: error }),
  setInboxId: (id) => set({ inboxId: id }),

  // Navigation
  setActiveView: (view) => set({ activeView: view }),
  setActiveServer: (serverId) => set({ activeServerId: serverId }),
  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),
  setActiveDmConversation: (conversationId) => set({ activeDmConversationId: conversationId }),

  // Servers
  setServers: (servers) => set({ servers }),
  addServer: (server) => set((s) => ({ servers: [...s.servers, server] })),
  removeServer: (serverId) => set((s) => ({
    servers: s.servers.filter((sv) => sv.id !== serverId),
  })),
  updateServerData: (serverId, data) => set((s) => ({
    servers: s.servers.map((sv) => sv.id === serverId ? { ...sv, ...data } : sv),
  })),

  // Channels
  setChannels: (serverId, channels) => set((s) => ({
    channels: { ...s.channels, [serverId]: channels },
  })),
  addChannel: (serverId, channel) => set((s) => ({
    channels: {
      ...s.channels,
      [serverId]: [...(s.channels[serverId] || []), channel],
    },
  })),
  removeChannel: (serverId, channelId) => set((s) => ({
    channels: {
      ...s.channels,
      [serverId]: (s.channels[serverId] || []).filter((ch) => ch.id !== channelId),
    },
  })),

  // Members
  setMembers: (serverId, members) => set((s) => ({
    members: { ...s.members, [serverId]: members },
  })),
  addMember: (serverId, member) => set((s) => ({
    members: {
      ...s.members,
      [serverId]: [...(s.members[serverId] || []), member],
    },
  })),
  removeMember: (serverId, walletAddress) => set((s) => ({
    members: {
      ...s.members,
      [serverId]: (s.members[serverId] || []).filter(
        (m) => m.wallet_address.toLowerCase() !== walletAddress.toLowerCase()
      ),
    },
  })),

  // Messages
  addMessage: (conversationId, message) => set((s) => ({
    messages: {
      ...s.messages,
      [conversationId]: [...(s.messages[conversationId] || []), message],
    },
  })),
  setMessages: (conversationId, messages) => set((s) => ({
    messages: { ...s.messages, [conversationId]: messages },
  })),
  prependMessages: (conversationId, messages) => set((s) => ({
    messages: {
      ...s.messages,
      [conversationId]: [...messages, ...(s.messages[conversationId] || [])],
    },
  })),

  // DMs
  setDmConversations: (dms) => set({ dmConversations: dms }),
  addDmConversation: (dm) => set((s) => ({
    dmConversations: [dm, ...s.dmConversations],
  })),
  updateDmConversation: (id, data) => set((s) => ({
    dmConversations: s.dmConversations.map((dm) =>
      dm.id === id ? { ...dm, ...data } : dm
    ),
  })),

  // Unread
  incrementUnread: (conversationId) => set((s) => ({
    unreadCounts: {
      ...s.unreadCounts,
      [conversationId]: (s.unreadCounts[conversationId] || 0) + 1,
    },
  })),
  clearUnread: (conversationId) => set((s) => ({
    unreadCounts: { ...s.unreadCounts, [conversationId]: 0 },
  })),

  // UI
  setActiveModal: (modal) => set({ activeModal: modal }),
  toggleMemberList: () => set((s) => ({ showMemberList: !s.showMemberList })),
  toggleSearch: () => set((s) => ({ showSearch: !s.showSearch })),

  // Reply
  setReplyingTo: (message) => set({ replyingTo: message }),

  // Reset
  reset: () => set(initialState),
}));
