/**
 * auction-admin — Auction House admin setters.
 */

import { type Address } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  makeAddressAction,
  makeNoArgAction,
  makeUintAction,
} from '../shared/factories';

const AUCTION_HOUSE = NOUNS_ADDRESSES.auctionHouse as Address;

export const adminAuctionReservePrice = makeUintAction({
  id: 'admin-auction-reserve-price',
  name: 'Set Auction Reserve Price',
  description: 'Minimum bid (in ETH) accepted at the start of each auction',
  category: 'auction-admin',
  target: AUCTION_HOUSE,
  signature: 'setReservePrice(uint192)',
  field: { name: 'amount', label: 'Amount (ETH)' },
  width: 'uint192',
  decimals: 18,
});

export const adminAuctionTimeBuffer = makeUintAction({
  id: 'admin-auction-time-buffer',
  name: 'Set Auction Time Buffer',
  description: 'Seconds added to the auction when a bid lands near the end',
  category: 'auction-admin',
  target: AUCTION_HOUSE,
  signature: 'setTimeBuffer(uint56)',
  field: { name: 'seconds', label: 'Seconds' },
  width: 'uint56',
});

export const adminAuctionMinBidIncrement = makeUintAction({
  id: 'admin-auction-min-bid-increment',
  name: 'Set Min Bid Increment %',
  description: 'Minimum percentage increase over the current bid for a new bid to be valid',
  category: 'auction-admin',
  target: AUCTION_HOUSE,
  // Signature declares uint8; encoding pads to 32 bytes either way. Use
  // uint256 here to byte-match the legacy generator, which used the
  // uint256 encoder regardless of declared width.
  signature: 'setMinBidIncrementPercentage(uint8)',
  field: { name: 'percentage', label: 'Percentage' },
  width: 'uint256',
});

export const adminAuctionPause = makeNoArgAction({
  id: 'admin-auction-pause',
  name: 'Pause Auctions',
  description: 'Stop new auctions from starting',
  category: 'auction-admin',
  target: AUCTION_HOUSE,
  signature: 'pause()',
});

export const adminAuctionUnpause = makeNoArgAction({
  id: 'admin-auction-unpause',
  name: 'Unpause Auctions',
  description: 'Resume auctions',
  category: 'auction-admin',
  target: AUCTION_HOUSE,
  signature: 'unpause()',
});

export const adminAuctionSanctionsOracle = makeAddressAction({
  id: 'admin-auction-sanctions-oracle',
  name: 'Set Sanctions Oracle',
  description: 'Oracle consulted before settling bids (OFAC compliance)',
  category: 'auction-admin',
  target: AUCTION_HOUSE,
  signature: 'setSanctionsOracle(address)',
  field: { name: 'address', label: 'Oracle Address' },
});
