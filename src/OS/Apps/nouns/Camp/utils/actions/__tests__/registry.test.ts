/**
 * Registry-level tests for the precedence contract: more-specific action defs
 * must win over generic ones when both could match the same action(s).
 *
 * These are the things isolated per-action tests CAN'T verify — they require
 * the registry's ordering and dispatch loop.
 */

import { describe, it, expect } from 'vitest';
import { parseEther } from 'viem';
import { findMatchingAction } from '../registry';
import { TOKEN_BUYER_ADDRESS } from '../../actionTemplates/constants';
import { emptyDecodeContext } from './roundTrip';

describe('registry precedence', () => {
  it('claims TokenBuyer ETH sends as tokenbuyer-refill-eth, not treasury-transfer', () => {
    const action = {
      target: TOKEN_BUYER_ADDRESS,
      value: parseEther('5').toString(),
      signature: '',
      calldata: '0x',
    };
    const match = findMatchingAction([action], 0, emptyDecodeContext());
    expect(match?.def.id).toBe('tokenbuyer-refill-eth');
  });

  it('claims regular ETH sends as treasury-transfer', () => {
    const action = {
      target: '0x1111111111111111111111111111111111111111',
      value: parseEther('1').toString(),
      signature: '',
      calldata: '0x',
    };
    const match = findMatchingAction([action], 0, emptyDecodeContext());
    expect(match?.def.id).toBe('treasury-transfer');
  });
});
