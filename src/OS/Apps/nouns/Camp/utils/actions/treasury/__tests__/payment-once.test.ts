import { describe, it, expect } from 'vitest';
import { paymentOnce } from '../payment-once';
import { PAYER_ADDRESS } from '../../../actionTemplates/constants';
import {
  assertNoMatch,
  assertRoundTrip,
} from '../../__tests__/roundTrip';

const RECIPIENT = '0x1234567890abcdef1234567890abcdef12345678';

describe('payment-once', () => {
  it('encodes sendOrRegisterDebt on the Payer', () => {
    const [action] = paymentOnce.encode(
      { recipient: RECIPIENT, amount: '1000' },
      {},
    );
    expect(action.target).toBe(PAYER_ADDRESS);
    expect(action.signature).toBe('sendOrRegisterDebt(address,uint256)');
  });

  it('round-trips USDC amounts (6 decimals)', () => {
    assertRoundTrip(paymentOnce, { recipient: RECIPIENT, amount: '500.25' });
  });

  it('round-trips whole-number amounts', () => {
    assertRoundTrip(paymentOnce, { recipient: RECIPIENT, amount: '10000' });
  });

  it('does not claim sendOrRegisterDebt on other contracts', () => {
    assertNoMatch(paymentOnce, [
      {
        target: '0x1111111111111111111111111111111111111111',
        value: '0',
        signature: 'sendOrRegisterDebt(address,uint256)',
        calldata: '0x',
      },
    ]);
  });
});
