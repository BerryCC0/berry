/**
 * Transfer filters — pure predicates and constants used by the noun_transfer
 * activity definition.
 *
 * Source: extracted from `useActivityFeed.ts:33-36` (constants) and
 * `useActivityFeed.ts:400-403` (filter predicate). No behavior change.
 */

/** AuctionHouse address. Transfers FROM here are auction settlements. */
export const AUCTION_HOUSE = '0x830bd73e4184cef73443c15111a1df14e495c706';

/** DAO treasury address. Transfers FROM here TO AuctionHouse are reserve transfers. */
export const NOUNS_TREASURY = '0xb1a32fc9f9d8b2cf86c068cae13108809547ef71';

/** Burn / mint address. Transfers from this are mints; transfers to this are burns. */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/** Average mainnet block time, used for end-block → timestamp estimation. */
export const BLOCK_TIME_SECONDS = 12;

/**
 * Returns true when the given transfer should be excluded from the activity
 * feed as a system-level (non-user) transfer:
 *
 *   - Mints: `from === ZERO_ADDRESS`
 *   - Auction settlements: `from === AUCTION_HOUSE`
 *   - Burns: `to === ZERO_ADDRESS`
 *   - Treasury → AuctionHouse reserve moves: matching pair
 *
 * Inputs are address strings as returned by the API (may be checksummed or
 * lowercase). We lowercase internally; callers don't need to pre-normalize.
 */
export function isMintOrAuctionTransfer(from: string, to: string): boolean {
  const f = (from || '').toLowerCase();
  const t = (to || '').toLowerCase();
  if (f === ZERO_ADDRESS) return true;
  if (f === AUCTION_HOUSE.toLowerCase()) return true;
  if (t === ZERO_ADDRESS) return true;
  if (f === NOUNS_TREASURY && t === AUCTION_HOUSE.toLowerCase()) return true;
  return false;
}
