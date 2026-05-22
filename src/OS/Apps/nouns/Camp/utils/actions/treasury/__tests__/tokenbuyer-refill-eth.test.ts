import { describe, it, expect } from 'vitest';
import { parseEther } from 'viem';
import { tokenbuyerRefillEth } from '../tokenbuyer-refill-eth';
import { TOKEN_BUYER_ADDRESS } from '../../../actionTemplates/constants';
import {
  assertNoMatch,
  assertRoundTrip,
  emptyEncodeContext,
} from '../../__tests__/roundTrip';

describe('tokenbuyer-refill-eth', () => {
  it('encodes a direct ETH transfer to the TokenBuyer', () => {
    const [action] = tokenbuyerRefillEth.encode(
      { ethAmount: '5' },
      emptyEncodeContext(),
    );
    expect(action.target).toBe(TOKEN_BUYER_ADDRESS);
    expect(action.value).toBe(parseEther('5').toString());
    expect(action.signature).toBe('');
    expect(action.calldata).toBe('0x');
  });

  it('round-trips', () => {
    assertRoundTrip(tokenbuyerRefillEth, { ethAmount: '2.5' });
  });

  it('does not claim ETH transfers to other targets', () => {
    assertNoMatch(tokenbuyerRefillEth, [
      {
        target: '0x1111111111111111111111111111111111111111',
        value: parseEther('1').toString(),
        signature: '',
        calldata: '0x',
      },
    ]);
  });

  it('does not claim zero-value calls to TokenBuyer', () => {
    assertNoMatch(tokenbuyerRefillEth, [
      {
        target: TOKEN_BUYER_ADDRESS,
        value: '0',
        signature: '',
        calldata: '0x',
      },
    ]);
  });
});
