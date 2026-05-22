import { describe, it, expect } from 'vitest';
import { parseEther, parseUnits } from 'viem';
import { treasuryTransfer } from '../transfer';
import {
  assertNoMatch,
  assertRoundTrip,
  emptyDecodeContext,
  emptyEncodeContext,
} from '../../__tests__/roundTrip';
import { COMMON_TOKENS } from '../../../actionTemplates/constants';

const RECIPIENT = '0x1234567890abcdef1234567890abcdef12345678';
const USDC = COMMON_TOKENS.find((t) => t.symbol === 'USDC')!;
const WETH = COMMON_TOKENS.find((t) => t.symbol === 'WETH')!;

function ethToken() {
  return JSON.stringify({
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    isNative: true,
  });
}

function tokenSelectValue(token: typeof USDC) {
  return JSON.stringify({
    symbol: token.symbol,
    address: token.address,
    decimals: token.decimals,
    isNative: false,
  });
}

describe('treasuryTransfer', () => {
  describe('encode', () => {
    it('produces a direct-value action for ETH transfers', () => {
      const actions = treasuryTransfer.encode(
        {
          token: ethToken(),
          recipient: RECIPIENT,
          amount: '1.5',
        },
        emptyEncodeContext(),
      );
      expect(actions).toEqual([
        {
          target: RECIPIENT,
          value: parseEther('1.5').toString(),
          signature: '',
          calldata: '0x',
        },
      ]);
    });

    it('produces a transfer() call on the token contract for ERC-20', () => {
      const actions = treasuryTransfer.encode(
        {
          token: tokenSelectValue(USDC),
          recipient: RECIPIENT,
          amount: '100',
        },
        emptyEncodeContext(),
      );
      expect(actions).toHaveLength(1);
      expect(actions[0].target).toBe(USDC.address);
      expect(actions[0].value).toBe('0');
      expect(actions[0].signature).toBe('transfer(address,uint256)');
      // calldata is `transfer(recipient, parseUnits('100', 6))` ABI-encoded.
      // Just sanity-check it starts with 0x and is the expected length:
      // 32 bytes (address pad) + 32 bytes (amount) = 64 bytes = 128 hex chars.
      expect(actions[0].calldata.startsWith('0x')).toBe(true);
      expect(actions[0].calldata.length).toBe(2 + 128);
    });
  });

  describe('round-trip', () => {
    it('ETH transfer survives encode → decode → encode', () => {
      assertRoundTrip(treasuryTransfer, {
        token: ethToken(),
        recipient: RECIPIENT,
        amount: '1.5',
      });
    });

    it('USDC transfer (6 decimals) survives encode → decode → encode', () => {
      assertRoundTrip(treasuryTransfer, {
        token: tokenSelectValue(USDC),
        recipient: RECIPIENT,
        amount: '12345.678901',
      });
    });

    it('WETH transfer (18 decimals) survives encode → decode → encode', () => {
      assertRoundTrip(treasuryTransfer, {
        token: tokenSelectValue(WETH),
        recipient: RECIPIENT,
        amount: '0.42',
      });
    });

    it('handles whole-number amounts without trailing dot', () => {
      assertRoundTrip(treasuryTransfer, {
        token: tokenSelectValue(USDC),
        recipient: RECIPIENT,
        amount: '1000',
      });
    });
  });

  describe('decode', () => {
    // Note: in isolation, treasury-transfer DOES match ETH sends to specialised
    // targets like the TokenBuyer — those are claimed first at the registry
    // walker level (see registry.ts ordering). This isolation test asserted
    // a defensive guard that we removed; precedence is now structural.

    it('does not claim non-transfer ERC-20 calls', () => {
      assertNoMatch(treasuryTransfer, [
        {
          target: USDC.address,
          value: '0',
          signature: 'approve(address,uint256)',
          calldata:
            '0x' +
            RECIPIENT.slice(2).padStart(64, '0') +
            BigInt(100).toString(16).padStart(64, '0'),
        },
      ]);
    });

    it('decodes the legacy sendETH(address,uint256) shape', () => {
      // Encoded calldata for sendETH(RECIPIENT, 1 ETH)
      const calldata =
        '0x' +
        RECIPIENT.slice(2).padStart(64, '0') +
        parseUnits('1', 18).toString(16).padStart(64, '0');
      const ctx = emptyDecodeContext();
      const NOUNS_TREASURY = '0xb1a32fc9f9d8b2cf86c068cae13108809547ef71'; // mainnet
      const match = treasuryTransfer.decode(
        [
          {
            target: NOUNS_TREASURY,
            value: '0',
            signature: 'sendETH(address,uint256)',
            calldata,
          },
        ],
        0,
        ctx,
      );
      expect(match).not.toBeNull();
      expect(match?.consumed).toBe(1);
      const decodedToken = JSON.parse(match!.values.token);
      expect(decodedToken.symbol).toBe('ETH');
      expect(decodedToken.isNative).toBe(true);
      expect(match!.values.recipient.toLowerCase()).toBe(RECIPIENT);
      expect(match!.values.amount).toBe('1');
    });
  });

  describe('describe', () => {
    it('renders a human-readable line for ETH transfers', () => {
      const actions = treasuryTransfer.encode(
        {
          token: ethToken(),
          recipient: RECIPIENT,
          amount: '2',
        },
        emptyEncodeContext(),
      );
      const descriptions = treasuryTransfer.describe(
        {
          token: ethToken(),
          recipient: RECIPIENT,
          amount: '2',
        },
        actions,
        emptyDecodeContext(),
      );
      expect(descriptions).toHaveLength(1);
      expect(descriptions[0].title).toBe('Send 2 ETH');
      expect(descriptions[0].description).toContain(RECIPIENT);
    });

    it('renders the token symbol for ERC-20 transfers', () => {
      const fields = {
        token: tokenSelectValue(USDC),
        recipient: RECIPIENT,
        amount: '500',
      };
      const actions = treasuryTransfer.encode(fields, emptyEncodeContext());
      const descriptions = treasuryTransfer.describe(
        fields,
        actions,
        emptyDecodeContext(),
      );
      expect(descriptions[0].title).toBe('Send 500 USDC');
    });
  });
});
