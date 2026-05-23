import { describe, it, expect } from 'vitest';
import { parseEther } from 'viem';
import { wethWrap } from '../weth-wrap';
import { EXTERNAL_CONTRACTS } from '../../../actionTemplates/constants';
import {
  assertNoMatch,
  assertRoundTrip,
  emptyEncodeContext,
} from '../../__tests__/roundTrip';

const WETH = EXTERNAL_CONTRACTS.WETH.address;

describe('weth-wrap', () => {
  it('encodes a value-bearing call to WETH.deposit()', () => {
    const [action] = wethWrap.encode(
      { ethAmount: '5' },
      emptyEncodeContext(),
    );
    expect(action.target).toBe(WETH);
    expect(action.value).toBe(parseEther('5').toString());
    expect(action.signature).toBe('deposit()');
    expect(action.calldata).toBe('0x');
  });

  it('round-trips', () => {
    assertRoundTrip(wethWrap, { ethAmount: '2.5' });
  });

  it('does not claim ETH transfers with empty signature to WETH', () => {
    // A `transfer to WETH` (no signature) is NOT a wrap — wrapping requires
    // explicitly invoking deposit(). Anyone sending plain ETH to the WETH
    // contract still gets it credited as WETH balance (via the receive
    // fallback), but we treat that as a treasury-transfer action shape.
    assertNoMatch(wethWrap, [
      {
        target: WETH,
        value: parseEther('1').toString(),
        signature: '',
        calldata: '0x',
      },
    ]);
  });

  it('does not claim deposit() to a different target', () => {
    assertNoMatch(wethWrap, [
      {
        target: '0x1111111111111111111111111111111111111111',
        value: parseEther('1').toString(),
        signature: 'deposit()',
        calldata: '0x',
      },
    ]);
  });

  it('does not claim zero-value deposit() calls', () => {
    assertNoMatch(wethWrap, [
      {
        target: WETH,
        value: '0',
        signature: 'deposit()',
        calldata: '0x',
      },
    ]);
  });
});
