import { describe, it, expect } from 'vitest';
import {
  encodeAbiParameters,
  parseAbiParameters,
  parseEther,
} from 'viem';
import { wethUnwrap } from '../weth-unwrap';
import { EXTERNAL_CONTRACTS } from '../../../actionTemplates/constants';
import {
  assertNoMatch,
  assertRoundTrip,
  emptyEncodeContext,
} from '../../__tests__/roundTrip';

const WETH = EXTERNAL_CONTRACTS.WETH.address;

describe('weth-unwrap', () => {
  it('encodes WETH.withdraw(amount)', () => {
    const [action] = wethUnwrap.encode(
      { wethAmount: '3' },
      emptyEncodeContext(),
    );
    expect(action.target).toBe(WETH);
    expect(action.value).toBe('0');
    expect(action.signature).toBe('withdraw(uint256)');
    expect(action.calldata).toBe(
      encodeAbiParameters(parseAbiParameters('uint256'), [parseEther('3')]),
    );
  });

  it('round-trips', () => {
    assertRoundTrip(wethUnwrap, { wethAmount: '0.123456789012345678' });
  });

  it('does not claim withdraw() on other targets', () => {
    assertNoMatch(wethUnwrap, [
      {
        target: '0x1111111111111111111111111111111111111111',
        value: '0',
        signature: 'withdraw(uint256)',
        calldata: encodeAbiParameters(parseAbiParameters('uint256'), [
          parseEther('1'),
        ]),
      },
    ]);
  });

  it('does not claim other signatures on WETH', () => {
    assertNoMatch(wethUnwrap, [
      {
        target: WETH,
        value: '0',
        signature: 'deposit()',
        calldata: '0x',
      },
    ]);
  });
});
