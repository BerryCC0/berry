import { describe, it, expect } from 'vitest';
import { parseEther } from 'viem';
import { auctionBid } from '../auction-bid';
import { NOUNS_ADDRESSES, BERRY_CLIENT_ID } from '@/app/lib/nouns';
import { assertRoundTrip } from '../../__tests__/roundTrip';

describe('auction-bid', () => {
  it('encodes createBid with the bid amount in value field', () => {
    const [action] = auctionBid.encode(
      { nounId: '1500', bidAmount: '10' },
      {},
    );
    expect(action.target).toBe(NOUNS_ADDRESSES.auctionHouse);
    expect(action.value).toBe(parseEther('10').toString());
    expect(action.signature).toBe('createBid(uint256,uint32)');
  });

  it('passes BERRY_CLIENT_ID so Berry OS earns client rewards on treasury bids', () => {
    // The calldata is `abi.encode(nounId, clientId)`. clientId is a uint32
    // sitting in the second 32-byte slot.
    const [action] = auctionBid.encode(
      { nounId: '1', bidAmount: '1' },
      {},
    );
    const clientIdHex = action.calldata.slice(2 + 64).padStart(64, '0');
    const clientId = parseInt(clientIdHex, 16);
    expect(clientId).toBe(BERRY_CLIENT_ID);
  });

  it('round-trips', () => {
    assertRoundTrip(auctionBid, { nounId: '1234', bidAmount: '50' });
  });
});
