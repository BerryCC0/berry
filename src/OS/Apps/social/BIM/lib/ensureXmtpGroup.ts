/**
 * ensureXmtpGroup — Creates an XMTP group for a channel if one doesn't exist,
 * persists the group ID to the database, and updates the store.
 */

import type { Client } from "@xmtp/browser-sdk";
import {
  GroupPermissionsOptions,
  PermissionPolicy,
} from "@xmtp/wasm-bindings";
import { useBimStore } from "../store/bimStore";

/**
 * Ensure a BIM channel has an associated XMTP group conversation.
 * If xmtp_group_id is already set, returns it immediately.
 * Otherwise creates a new XMTP group, saves it via API, and updates the store.
 */
export async function ensureXmtpGroup(
  client: Client,
  opts: {
    serverId: string;
    channelId: string;
    channelName: string;
    xmtpGroupId: string | null;
    walletAddress: string;
  }
): Promise<string | null> {
  // Already has a group
  if (opts.xmtpGroupId) return opts.xmtpGroupId;

  try {
    console.log("[BIM] Creating XMTP group for channel:", opts.channelName);

    // Create an XMTP group with admin-only permissions for a Discord-like model.
    // The creator becomes a super admin automatically.
    const group = await client.conversations.createGroup([], {
      groupName: opts.channelName,
      groupDescription: `BIM channel: ${opts.channelName}`,
      permissions: GroupPermissionsOptions.CustomPolicy,
      customPermissionPolicySet: {
        addMemberPolicy: PermissionPolicy.Admin,
        removeMemberPolicy: PermissionPolicy.Admin,
        addAdminPolicy: PermissionPolicy.SuperAdmin,
        removeAdminPolicy: PermissionPolicy.SuperAdmin,
        updateGroupNamePolicy: PermissionPolicy.Admin,
        updateGroupDescriptionPolicy: PermissionPolicy.Admin,
        updateGroupImageUrlSquarePolicy: PermissionPolicy.Admin,
        updateMessageDisappearingPolicy: PermissionPolicy.SuperAdmin,
        updateAppDataPolicy: PermissionPolicy.Admin,
      },
    });

    const groupId = group.id;
    console.log("[BIM] XMTP group created:", groupId);

    // Persist to database via API
    await fetch(`/api/bim/servers/${opts.serverId}/channels/${opts.channelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: opts.walletAddress,
        xmtp_group_id: groupId,
      }),
    });

    // Update the store so UI reflects immediately
    useBimStore.getState().updateChannelData(opts.serverId, opts.channelId, {
      xmtp_group_id: groupId,
    });

    return groupId;
  } catch (err) {
    console.error("[BIM] Failed to create XMTP group:", err);
    return null;
  }
}

/**
 * Sync channel name/description changes to the XMTP group metadata.
 * Only works if the current user has admin/super-admin permissions on the group.
 */
export async function updateXmtpGroupMetadata(
  client: Client,
  xmtpGroupId: string,
  updates: { name?: string; description?: string }
): Promise<void> {
  try {
    const conversation = await client.conversations.getConversationById(xmtpGroupId);
    if (!conversation) return;

    // getConversationById returns Group for group conversations
    const group = conversation as import("@xmtp/browser-sdk").Group;
    if (typeof group.updateName !== "function") return;

    if (updates.name) {
      await group.updateName(updates.name);
    }
    if (updates.description) {
      await group.updateDescription(updates.description);
    }

    console.log("[BIM] Updated XMTP group metadata for", xmtpGroupId);
  } catch (err) {
    console.error("[BIM] Failed to update XMTP group metadata:", err);
  }
}
