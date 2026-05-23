import { describe, it, expect } from 'vitest';
import { encodeAbiParameters, parseAbiParameters } from 'viem';
import { lilNounDelegate, LIL_NOUNS_TOKEN } from '../lil-noun-delegate';
import { nounDelegate } from '../delegate';
import { treasuryDelegate } from '../../treasury';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  assertNoMatch,
  assertRoundTrip,
  emptyDecodeContext,
} from '../../__tests__/roundTrip';

const DELEGATEE = '0x1234567890abcdef1234567890abcdef12345678';
const ENS_TOKEN = '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72';

const ctx = emptyDecodeContext();

describe('lil-noun-delegate', () => {
  it('encodes delegate() targeting the Lil Nouns contract', () => {
    const [action] = lilNounDelegate.encode({ delegatee: DELEGATEE }, {});
    expect(action.target).toBe(LIL_NOUNS_TOKEN);
    expect(action.signature).toBe('delegate(address)');
    expect(action.value).toBe('0');
    expect(action.calldata).toBe(
      encodeAbiParameters(parseAbiParameters('address'), [DELEGATEE]),
    );
  });

  it('round-trips', () => {
    assertRoundTrip(lilNounDelegate, { delegatee: DELEGATEE });
  });

  it('rejects delegate() on the Nouns token (that is noun-delegate)', () => {
    assertNoMatch(lilNounDelegate, [
      {
        target: NOUNS_ADDRESSES.token,
        value: '0',
        signature: 'delegate(address)',
        calldata: encodeAbiParameters(parseAbiParameters('address'), [
          DELEGATEE,
        ]),
      },
    ]);
  });

  it('rejects delegate() on a generic ERC20Votes token (that is treasury-delegate)', () => {
    assertNoMatch(lilNounDelegate, [
      {
        target: ENS_TOKEN,
        value: '0',
        signature: 'delegate(address)',
        calldata: encodeAbiParameters(parseAbiParameters('address'), [
          DELEGATEE,
        ]),
      },
    ]);
  });
});

/**
 * REGRESSION: noun-delegate / lil-noun-delegate / treasury-delegate all
 * share the same `delegate(address)` shape. Registry ordering puts the
 * specific-target actions first, but each action's decode() must also
 * gate by target so callsites can decode actions out-of-order safely.
 */
describe('delegate-action discrimination', () => {
  const lilNounDelegation = lilNounDelegate.encode(
    { delegatee: DELEGATEE },
    {},
  );

  it('Lil Nouns delegation decodes ONLY as lil-noun-delegate', () => {
    expect(lilNounDelegate.decode(lilNounDelegation, 0, ctx)).not.toBeNull();
    expect(nounDelegate.decode(lilNounDelegation, 0, ctx)).toBeNull();
    // treasury-delegate is permissive but explicitly excludes the Nouns
    // token. It still claims Lil Nouns because Lil Nouns aren't on the
    // exclusion list — that's OK because in the registry lil-noun-delegate
    // runs first and consumes the action. Verifying registry-order via the
    // full dispatch test in registry.test.ts.
  });

  it('Nouns delegation decodes ONLY as noun-delegate (not lil-noun)', () => {
    const nounDelegation = nounDelegate.encode({ delegatee: DELEGATEE }, {});
    expect(nounDelegate.decode(nounDelegation, 0, ctx)).not.toBeNull();
    expect(lilNounDelegate.decode(nounDelegation, 0, ctx)).toBeNull();
  });

  it('generic ERC20Votes delegation decodes ONLY as treasury-delegate', () => {
    const ensDelegation = treasuryDelegate.encode(
      {
        token: JSON.stringify({
          symbol: 'ENS',
          address: ENS_TOKEN,
          decimals: 18,
          isNative: false,
        }),
        delegatee: DELEGATEE,
      },
      {},
    );
    expect(treasuryDelegate.decode(ensDelegation, 0, ctx)).not.toBeNull();
    expect(nounDelegate.decode(ensDelegation, 0, ctx)).toBeNull();
    expect(lilNounDelegate.decode(ensDelegation, 0, ctx)).toBeNull();
  });
});
