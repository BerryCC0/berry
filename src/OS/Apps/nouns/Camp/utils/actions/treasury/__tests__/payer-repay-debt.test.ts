import { describe, it, expect } from 'vitest';
import { encodeAbiParameters, parseAbiParameters, parseUnits } from 'viem';
import { payerRepayDebt } from '../payer-repay-debt';
import {
  EXTERNAL_CONTRACTS,
  PAYER_ADDRESS,
} from '../../../actionTemplates/constants';
import {
  assertNoMatch,
  assertRoundTrip,
  emptyDecodeContext,
} from '../../__tests__/roundTrip';

describe('payer-repay-debt (multi-action)', () => {
  it('encodes exactly 2 actions with linked group IDs', () => {
    const actions = payerRepayDebt.encode({ usdcAmount: '5000' }, {});
    expect(actions).toHaveLength(2);
    expect(actions[0].isPartOfMultiAction).toBe(true);
    expect(actions[1].isPartOfMultiAction).toBe(true);
    expect(actions[0].multiActionGroupId).toBe(actions[1].multiActionGroupId);
    expect(actions[0].multiActionIndex).toBe(0);
    expect(actions[1].multiActionIndex).toBe(1);
  });

  it('uses deterministic group IDs (no Date.now())', () => {
    const a = payerRepayDebt.encode({ usdcAmount: '100' }, {});
    const b = payerRepayDebt.encode({ usdcAmount: '100' }, {});
    expect(a[0].multiActionGroupId).toBe(b[0].multiActionGroupId);
  });

  it('round-trips through encode → decode → encode', () => {
    assertRoundTrip(payerRepayDebt, { usdcAmount: '12345.6789' });
  });

  it('decode consumes 2 actions when both legs match', () => {
    const actions = payerRepayDebt.encode({ usdcAmount: '999' }, {});
    const match = payerRepayDebt.decode(actions, 0, emptyDecodeContext());
    expect(match?.consumed).toBe(2);
  });

  it('does not match when approve and payBackDebt amounts disagree', () => {
    const approve = {
      target: EXTERNAL_CONTRACTS.USDC.address,
      value: '0',
      signature: 'approve(address,uint256)',
      calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
        PAYER_ADDRESS,
        parseUnits('100', 6),
      ]),
    };
    const repay = {
      target: PAYER_ADDRESS,
      value: '0',
      signature: 'payBackDebt(uint256)',
      calldata: encodeAbiParameters(parseAbiParameters('uint256'), [
        parseUnits('200', 6),
      ]),
    };
    assertNoMatch(payerRepayDebt, [approve, repay]);
  });

  it('does not match a lone approve without a following payBackDebt', () => {
    assertNoMatch(payerRepayDebt, [
      {
        target: EXTERNAL_CONTRACTS.USDC.address,
        value: '0',
        signature: 'approve(address,uint256)',
        calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
          PAYER_ADDRESS,
          parseUnits('100', 6),
        ]),
      },
    ]);
  });
});
