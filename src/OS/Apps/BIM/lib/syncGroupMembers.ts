/**
 * syncGroupMembers — Ensures all BIM server members are added to an XMTP group.
 *
 * Only an existing group member can add new members. This function is called
 * by whoever loads the channel first (typically the server creator / admin).
 * Members who are not on XMTP yet are silently skipped.
 */

import { IdentifierKind, type Client, type Group } from "@xmtp/browser-sdk";

// Track in-flight syncs to prevent duplicate work
const syncInFlight = new Set<string>();

/**
 * Sync BIM server members into an XMTP group conversation.
 *
 * @param client          The current user's XMTP client
 * @param group           The XMTP group (returned by getConversationById for group chats)
 * @param memberAddresses Array of wallet addresses from the BIM DB
 * @returns Number of members added, or -1 if skipped
 */
export async function syncGroupMembers(
  client: Client,
  group: Group,
  memberAddresses: string[]
): Promise<number> {
  const groupId = group.id;

  // Prevent concurrent syncs for the same group
  if (syncInFlight.has(groupId)) return -1;
  syncInFlight.add(groupId);

  try {
    // 1. Get current XMTP group members
    await group.sync();
    const xmtpMembers = await group.members();
    const existingInboxIds = new Set(xmtpMembers.map((m) => m.inboxId));

    // 2. Build a set of existing wallet addresses already in the group
    const existingAddresses = new Set<string>();
    for (const m of xmtpMembers) {
      for (const ident of m.accountIdentifiers) {
        existingAddresses.add(ident.identifier.toLowerCase());
      }
    }

    // 3. Find DB members not in the XMTP group
    const missingAddresses = memberAddresses.filter(
      (addr) => !existingAddresses.has(addr.toLowerCase())
    );

    if (missingAddresses.length === 0) return 0;

    console.log(
      `[BIM] syncGroupMembers: ${missingAddresses.length} members to add to group ${groupId}`
    );

    // 4. Resolve missing wallet addresses to XMTP inbox IDs
    const inboxIdsToAdd: string[] = [];
    for (const addr of missingAddresses) {
      try {
        const inboxId = await client.fetchInboxIdByIdentifier({
          identifier: addr,
          identifierKind: IdentifierKind.Ethereum,
        });
        if (inboxId && !existingInboxIds.has(inboxId)) {
          inboxIdsToAdd.push(inboxId);
        }
      } catch {
        // Member may not be on XMTP yet — skip silently
        console.log(`[BIM] Skipping ${addr} — not on XMTP or lookup failed`);
      }
    }

    if (inboxIdsToAdd.length === 0) return 0;

    // 5. Add all missing members in one call
    await group.addMembers(inboxIdsToAdd);
    console.log(`[BIM] Added ${inboxIdsToAdd.length} members to group ${groupId}`);
    return inboxIdsToAdd.length;
  } catch (err) {
    console.error("[BIM] syncGroupMembers failed:", err);
    return 0;
  } finally {
    syncInFlight.delete(groupId);
  }
}

/**
 * Remove a member from all XMTP groups for a server's channels.
 *
 * @param client          The current user's XMTP client
 * @param channelGroupIds Array of xmtp_group_id values for the server's channels
 * @param walletAddress   Wallet address of the member to remove
 */
export async function removeMemberFromXmtpGroups(
  client: Client,
  channelGroupIds: string[],
  walletAddress: string
): Promise<void> {
  // Resolve wallet to inbox ID
  let inboxId: string | undefined;
  try {
    inboxId = await client.fetchInboxIdByIdentifier({
      identifier: walletAddress,
      identifierKind: IdentifierKind.Ethereum,
    });
  } catch {
    console.error("[BIM] Could not resolve inbox ID for", walletAddress);
    return;
  }

  if (!inboxId) return;

  for (const groupId of channelGroupIds) {
    try {
      const conversation = await client.conversations.getConversationById(groupId);
      if (!conversation) continue;
      const group = conversation as Group;
      if (typeof group.removeMembers !== "function") continue;
      await group.removeMembers([inboxId]);
      console.log(`[BIM] Removed ${walletAddress} from group ${groupId}`);
    } catch (err) {
      console.error(`[BIM] Failed to remove member from group ${groupId}:`, err);
    }
  }
}
