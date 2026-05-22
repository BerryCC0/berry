/**
 * Smoke tests for the full registry — invariants that should hold no matter
 * which subset of actions is currently migrated. Catches the classes of bug
 * that per-action tests can't see (duplicate IDs, ordering violations,
 * lazy-import cycles).
 */

import { describe, it, expect } from 'vitest';
import { parseEther } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  findMatchingAction,
  transactionActions,
} from '../registry';
import { emptyDecodeContext } from './roundTrip';
import {
  TOKEN_BUYER_ADDRESS,
  PAYER_ADDRESS,
} from '../../actionTemplates/constants';

describe('registry — invariants', () => {
  it('has no duplicate action ids', () => {
    const ids = transactionActions.map((d) => d.id);
    const unique = new Set(ids);
    expect(ids.length).toBe(unique.size);
  });

  it('every action has a name and a category', () => {
    for (const def of transactionActions) {
      expect(def.id).toBeTruthy();
      expect(def.name).toBeTruthy();
      expect(def.category).toBeTruthy();
    }
  });

  it('every action exposes the required lifecycle methods', () => {
    for (const def of transactionActions) {
      expect(typeof def.encode).toBe('function');
      expect(typeof def.decode).toBe('function');
      expect(typeof def.describe).toBe('function');
    }
  });
});

describe('registry — ordering / precedence', () => {
  const ctx = emptyDecodeContext();

  it('tokenbuyer-refill-eth wins over treasury-transfer for TokenBuyer targets', () => {
    const match = findMatchingAction(
      [
        {
          target: TOKEN_BUYER_ADDRESS,
          value: parseEther('3').toString(),
          signature: '',
          calldata: '0x',
        },
      ],
      0,
      ctx,
    );
    expect(match?.def.id).toBe('tokenbuyer-refill-eth');
  });

  it('plain ETH sends to arbitrary addresses resolve to treasury-transfer', () => {
    const match = findMatchingAction(
      [
        {
          target: '0x1111111111111111111111111111111111111111',
          value: parseEther('1').toString(),
          signature: '',
          calldata: '0x',
        },
      ],
      0,
      ctx,
    );
    expect(match?.def.id).toBe('treasury-transfer');
  });

  it('noun-delegate wins over treasury-delegate for the Nouns token', () => {
    // delegate(0xanyone) on the Nouns token
    const calldata =
      '0x' +
      '0000000000000000000000001111111111111111111111111111111111111111';
    const match = findMatchingAction(
      [
        {
          target: NOUNS_ADDRESSES.token,
          value: '0',
          signature: 'delegate(address)',
          calldata,
        },
      ],
      0,
      ctx,
    );
    expect(match?.def.id).toBe('noun-delegate');
  });

  it('treasury-delegate claims delegate() on non-Nouns tokens', () => {
    const ensToken = '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72';
    const calldata =
      '0x' +
      '0000000000000000000000001111111111111111111111111111111111111111';
    const match = findMatchingAction(
      [
        {
          target: ensToken,
          value: '0',
          signature: 'delegate(address)',
          calldata,
        },
      ],
      0,
      ctx,
    );
    expect(match?.def.id).toBe('treasury-delegate');
  });

  it('payer-repay-debt consumes both legs of the approve+payBackDebt pair', () => {
    // Two actions with matching amounts (1000 USDC)
    const amount = (BigInt(1000) * BigInt(1000000)).toString(16).padStart(64, '0');
    const usdc = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const payerPadded = PAYER_ADDRESS.slice(2).toLowerCase().padStart(64, '0');

    const match = findMatchingAction(
      [
        {
          target: usdc,
          value: '0',
          signature: 'approve(address,uint256)',
          calldata: `0x${payerPadded}${amount}`,
        },
        {
          target: PAYER_ADDRESS,
          value: '0',
          signature: 'payBackDebt(uint256)',
          calldata: `0x${amount}`,
        },
      ],
      0,
      ctx,
    );
    expect(match?.def.id).toBe('payer-repay-debt');
    expect(match?.match.consumed).toBe(2);
  });
});
