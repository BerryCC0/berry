/**
 * BIM Database Query Helpers
 * Uses Neon serverless client (same pattern as ponder-db.ts)
 */

import { neon } from "@neondatabase/serverless";

function sql() {
  return neon(process.env.DATABASE_URL!);
}

// ============================================================================
// Profiles
// ============================================================================

export interface BimProfile {
  wallet_address: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string | null;
  xmtp_inbox_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function getProfile(walletAddress: string): Promise<BimProfile | null> {
  const db = sql();
  const rows = await db`
    SELECT * FROM bim_profiles WHERE LOWER(wallet_address) = LOWER(${walletAddress})
  `;
  return (rows[0] as BimProfile) ?? null;
}

export async function upsertProfile(
  walletAddress: string,
  data: { display_name?: string; avatar_url?: string; status?: string; xmtp_inbox_id?: string }
): Promise<BimProfile> {
  const db = sql();
  const rows = await db`
    INSERT INTO bim_profiles (wallet_address, display_name, avatar_url, status, xmtp_inbox_id)
    VALUES (${walletAddress.toLowerCase()}, ${data.display_name ?? null}, ${data.avatar_url ?? null}, ${data.status ?? null}, ${data.xmtp_inbox_id ?? null})
    ON CONFLICT (wallet_address) DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, bim_profiles.display_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, bim_profiles.avatar_url),
      status = COALESCE(EXCLUDED.status, bim_profiles.status),
      xmtp_inbox_id = COALESCE(EXCLUDED.xmtp_inbox_id, bim_profiles.xmtp_inbox_id),
      updated_at = NOW()
    RETURNING *
  `;
  return rows[0] as BimProfile;
}

export async function getProfiles(walletAddresses: string[]): Promise<BimProfile[]> {
  if (walletAddresses.length === 0) return [];
  const db = sql();
  const lower = walletAddresses.map((a) => a.toLowerCase());
  const rows = await db`
    SELECT * FROM bim_profiles WHERE LOWER(wallet_address) = ANY(${lower})
  `;
  return rows as BimProfile[];
}

// ============================================================================
// Servers
// ============================================================================

export interface BimServer {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  owner_address: string;
  invite_code: string | null;
  is_token_gated: boolean;
  token_gate_config: unknown | null;
  created_at: string;
  updated_at: string;
}

export async function getServersForUser(walletAddress: string): Promise<BimServer[]> {
  const db = sql();
  const rows = await db`
    SELECT s.* FROM bim_servers s
    JOIN bim_server_members m ON m.server_id = s.id
    WHERE LOWER(m.wallet_address) = LOWER(${walletAddress})
    ORDER BY s.created_at ASC
  `;
  return rows as BimServer[];
}

export async function getServerById(serverId: string): Promise<BimServer | null> {
  const db = sql();
  const rows = await db`SELECT * FROM bim_servers WHERE id = ${serverId}`;
  return (rows[0] as BimServer) ?? null;
}

export async function getServerByInviteCode(inviteCode: string): Promise<BimServer | null> {
  const db = sql();
  const rows = await db`SELECT * FROM bim_servers WHERE invite_code = ${inviteCode}`;
  return (rows[0] as BimServer) ?? null;
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createServer(
  ownerAddress: string,
  data: { name: string; description?: string; icon_url?: string; is_token_gated?: boolean; token_gate_config?: unknown }
): Promise<BimServer> {
  const db = sql();
  const inviteCode = generateInviteCode();

  const rows = await db`
    INSERT INTO bim_servers (name, description, icon_url, owner_address, invite_code, is_token_gated, token_gate_config)
    VALUES (${data.name}, ${data.description ?? null}, ${data.icon_url ?? null}, ${ownerAddress.toLowerCase()}, ${inviteCode}, ${data.is_token_gated ?? false}, ${data.token_gate_config ? JSON.stringify(data.token_gate_config) : null})
    RETURNING *
  `;
  const server = rows[0] as BimServer;

  // Add owner as member
  await db`
    INSERT INTO bim_server_members (server_id, wallet_address, role)
    VALUES (${server.id}, ${ownerAddress.toLowerCase()}, 'owner')
  `;

  return server;
}

export async function updateServer(
  serverId: string,
  data: { name?: string; description?: string; icon_url?: string; is_token_gated?: boolean; token_gate_config?: unknown }
): Promise<BimServer | null> {
  const db = sql();
  const rows = await db`
    UPDATE bim_servers SET
      name = COALESCE(${data.name ?? null}, name),
      description = COALESCE(${data.description ?? null}, description),
      icon_url = COALESCE(${data.icon_url ?? null}, icon_url),
      is_token_gated = COALESCE(${data.is_token_gated ?? null}, is_token_gated),
      token_gate_config = COALESCE(${data.token_gate_config ? JSON.stringify(data.token_gate_config) : null}, token_gate_config),
      updated_at = NOW()
    WHERE id = ${serverId}
    RETURNING *
  `;
  return (rows[0] as BimServer) ?? null;
}

export async function deleteServer(serverId: string): Promise<boolean> {
  const db = sql();
  const rows = await db`DELETE FROM bim_servers WHERE id = ${serverId} RETURNING id`;
  return rows.length > 0;
}

export async function regenerateInviteCode(serverId: string): Promise<string> {
  const db = sql();
  const code = generateInviteCode();
  await db`UPDATE bim_servers SET invite_code = ${code} WHERE id = ${serverId}`;
  return code;
}

// ============================================================================
// Channels
// ============================================================================

export interface BimChannel {
  id: string;
  server_id: string;
  name: string;
  description: string | null;
  xmtp_group_id: string | null;
  position: number;
  is_default: boolean;
  created_at: string;
}

export async function getChannelsForServer(serverId: string): Promise<BimChannel[]> {
  const db = sql();
  const rows = await db`
    SELECT * FROM bim_channels WHERE server_id = ${serverId} ORDER BY position ASC, created_at ASC
  `;
  return rows as BimChannel[];
}

export async function createChannel(
  serverId: string,
  data: { name: string; description?: string; xmtp_group_id?: string; is_default?: boolean }
): Promise<BimChannel> {
  const db = sql();
  // Get max position
  const posRows = await db`SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM bim_channels WHERE server_id = ${serverId}`;
  const nextPos = (posRows[0] as { next_pos: number }).next_pos;

  const rows = await db`
    INSERT INTO bim_channels (server_id, name, description, xmtp_group_id, position, is_default)
    VALUES (${serverId}, ${data.name}, ${data.description ?? null}, ${data.xmtp_group_id ?? null}, ${nextPos}, ${data.is_default ?? false})
    RETURNING *
  `;
  return rows[0] as BimChannel;
}

export async function updateChannelXmtpGroupId(channelId: string, xmtpGroupId: string): Promise<void> {
  const db = sql();
  await db`UPDATE bim_channels SET xmtp_group_id = ${xmtpGroupId} WHERE id = ${channelId}`;
}

export async function deleteChannel(channelId: string): Promise<boolean> {
  const db = sql();
  const rows = await db`DELETE FROM bim_channels WHERE id = ${channelId} AND is_default = FALSE RETURNING id`;
  return rows.length > 0;
}

// ============================================================================
// Members
// ============================================================================

export interface BimMember {
  server_id: string;
  wallet_address: string;
  role: string;
  nickname: string | null;
  joined_at: string;
}

export async function getMembersForServer(serverId: string): Promise<BimMember[]> {
  const db = sql();
  const rows = await db`
    SELECT * FROM bim_server_members WHERE server_id = ${serverId} ORDER BY joined_at ASC
  `;
  return rows as BimMember[];
}

export async function addMember(
  serverId: string,
  walletAddress: string,
  role: string = "member"
): Promise<BimMember> {
  const db = sql();
  const rows = await db`
    INSERT INTO bim_server_members (server_id, wallet_address, role)
    VALUES (${serverId}, ${walletAddress.toLowerCase()}, ${role})
    ON CONFLICT (server_id, wallet_address) DO NOTHING
    RETURNING *
  `;
  // If already exists, fetch it
  if (rows.length === 0) {
    const existing = await db`
      SELECT * FROM bim_server_members
      WHERE server_id = ${serverId} AND LOWER(wallet_address) = LOWER(${walletAddress})
    `;
    return existing[0] as BimMember;
  }
  return rows[0] as BimMember;
}

export async function removeMember(serverId: string, walletAddress: string): Promise<boolean> {
  const db = sql();
  const rows = await db`
    DELETE FROM bim_server_members
    WHERE server_id = ${serverId} AND LOWER(wallet_address) = LOWER(${walletAddress}) AND role != 'owner'
    RETURNING server_id
  `;
  return rows.length > 0;
}

export async function updateMemberRole(
  serverId: string,
  walletAddress: string,
  role: string
): Promise<BimMember | null> {
  const db = sql();
  const rows = await db`
    UPDATE bim_server_members SET role = ${role}
    WHERE server_id = ${serverId} AND LOWER(wallet_address) = LOWER(${walletAddress})
    RETURNING *
  `;
  return (rows[0] as BimMember) ?? null;
}

export async function isMember(serverId: string, walletAddress: string): Promise<boolean> {
  const db = sql();
  const rows = await db`
    SELECT 1 FROM bim_server_members
    WHERE server_id = ${serverId} AND LOWER(wallet_address) = LOWER(${walletAddress})
  `;
  return rows.length > 0;
}

export async function getMemberRole(serverId: string, walletAddress: string): Promise<string | null> {
  const db = sql();
  const rows = await db`
    SELECT role FROM bim_server_members
    WHERE server_id = ${serverId} AND LOWER(wallet_address) = LOWER(${walletAddress})
  `;
  return rows.length > 0 ? (rows[0] as { role: string }).role : null;
}

// ============================================================================
// Push Subscriptions
// ============================================================================

export async function addPushSubscription(
  walletAddress: string,
  endpoint: string,
  p256dhKey: string,
  authKey: string
): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO bim_push_subscriptions (wallet_address, endpoint, p256dh_key, auth_key)
    VALUES (${walletAddress.toLowerCase()}, ${endpoint}, ${p256dhKey}, ${authKey})
    ON CONFLICT (wallet_address, endpoint) DO UPDATE SET
      p256dh_key = EXCLUDED.p256dh_key,
      auth_key = EXCLUDED.auth_key
  `;
}

export async function removePushSubscription(walletAddress: string, endpoint: string): Promise<void> {
  const db = sql();
  await db`
    DELETE FROM bim_push_subscriptions
    WHERE LOWER(wallet_address) = LOWER(${walletAddress}) AND endpoint = ${endpoint}
  `;
}

export async function getPushSubscriptions(walletAddress: string): Promise<{ endpoint: string; p256dh_key: string; auth_key: string }[]> {
  const db = sql();
  const rows = await db`
    SELECT endpoint, p256dh_key, auth_key FROM bim_push_subscriptions
    WHERE LOWER(wallet_address) = LOWER(${walletAddress})
  `;
  return rows as { endpoint: string; p256dh_key: string; auth_key: string }[];
}
