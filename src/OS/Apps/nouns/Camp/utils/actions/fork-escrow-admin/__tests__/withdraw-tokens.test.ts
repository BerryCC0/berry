/**
 * Round-trip tests for the corrected fork-escrow withdraw action.
 *
 * The action targets the GOVERNOR proxy (not the ForkEscrow) and picks
 * the right Governor wrapper function based on whether the recipient is
 * the treasury.
 */

import { describe, it, expect } from 'vitest';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import { adminForkEscrowWithdrawTokens } from '../withdraw-tokens';
import { assertRoundTrip } from '../../__tests__/roundTrip';

const NON_TREASURY = '0x1234567890abcdef1234567890abcdef12345678';

describe('admin-fork-escrow-withdraw-tokens', () => {
  it('targets the Governor proxy (not the ForkEscrow)', () => {
    const [action] = adminForkEscrowWithdrawTokens.encode(
      { tokenIds: '42', recipient: NOUNS_ADDRESSES.treasury },
      {},
    );
    expect(action.target).toBe(NOUNS_ADDRESSES.governor);
  });

  it('picks the to-treasury signature when recipient = treasury', () => {
    const [action] = adminForkEscrowWithdrawTokens.encode(
      { tokenIds: '1, 2, 3', recipient: NOUNS_ADDRESSES.treasury },
      {},
    );
    expect(action.signature).toBe(
      'withdrawDAONounsFromEscrowToTreasury(uint256[])',
    );
  });

  it('picks the increasing-supply signature for non-treasury recipients', () => {
    const [action] = adminForkEscrowWithdrawTokens.encode(
      { tokenIds: '1, 2, 3', recipient: NON_TREASURY },
      {},
    );
    expect(action.signature).toBe(
      'withdrawDAONounsFromEscrowIncreasingTotalSupply(uint256[],address)',
    );
  });

  it('round-trips a treasury-targeted withdraw', () => {
    assertRoundTrip(adminForkEscrowWithdrawTokens, {
      tokenIds: '42, 99',
      recipient: NOUNS_ADDRESSES.treasury,
    });
  });

  it('round-trips a non-treasury withdraw', () => {
    assertRoundTrip(adminForkEscrowWithdrawTokens, {
      tokenIds: '1234',
      recipient: NON_TREASURY,
    });
  });

  it('describes the action as a single line', () => {
    const fields = { tokenIds: '1, 2', recipient: NOUNS_ADDRESSES.treasury };
    const actions = adminForkEscrowWithdrawTokens.encode(fields, {});
    const descriptions = adminForkEscrowWithdrawTokens.describe(
      fields,
      actions,
      {
        streamAddresses: new Set(),
        cancelledStreams: new Set(),
        streams: new Map(),
        tokens: new Map(),
      },
    );
    expect(descriptions).toHaveLength(1);
    expect(descriptions[0].functionName).toBe(
      'withdrawDAONounsFromEscrowToTreasury',
    );
  });
});
