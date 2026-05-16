/**
 * Food Nouns Auction House (V1 fork) — indexer-grade ABI.
 * Proxy: 0xfAa4bbe589a39745833e2BecE8d401b6195A07b1
 *
 * V1 fork: no clientId on bids, no refundable bids.
 */
export const fnAuctionHouseAbi = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "nounId", type: "uint256" },
      { indexed: false, name: "startTime", type: "uint256" },
      { indexed: false, name: "endTime", type: "uint256" },
    ],
    name: "AuctionCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "nounId", type: "uint256" },
      { indexed: false, name: "sender", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
      { indexed: false, name: "extended", type: "bool" },
    ],
    name: "AuctionBid",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "nounId", type: "uint256" },
      { indexed: false, name: "endTime", type: "uint256" },
    ],
    name: "AuctionExtended",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "nounId", type: "uint256" },
      { indexed: false, name: "winner", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "AuctionSettled",
    type: "event",
  },
] as const;
