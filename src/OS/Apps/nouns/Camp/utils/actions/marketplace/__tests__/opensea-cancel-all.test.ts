import { describe, it, expect } from 'vitest';
import { openseaCancelAll } from '../opensea-cancel-all';
import { SEAPORT_1_6 } from '../_seaport';
import {
  assertRoundTrip,
  emptyDecodeContext,
} from '../../__tests__/roundTrip';

describe('opensea-cancel-all', () => {
  it('targets Seaport with incrementCounter()', () => {
    const [action] = openseaCancelAll.encode({}, {});
    expect(action.target).toBe(SEAPORT_1_6);
    expect(action.signature).toBe('incrementCounter()');
    expect(action.calldata).toBe('0x');
    expect(action.value).toBe('0');
  });

  it('round-trips with no fields', () => {
    assertRoundTrip(openseaCancelAll, {});
  });

  it('rejects actions on other targets', () => {
    const match = openseaCancelAll.decode(
      [
        {
          target: '0x1111111111111111111111111111111111111111',
          value: '0',
          signature: 'incrementCounter()',
          calldata: '0x',
        },
      ],
      0,
      emptyDecodeContext(),
    );
    expect(match).toBeNull();
  });
});
