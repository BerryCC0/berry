/**
 * Nouns Contract Configuration
 * All contract addresses and ABIs for Nouns DAO
 * 
 * All contracts are on Ethereum Mainnet (Chain ID: 1)
 */

// ============================================================================
// CONTRACT ADDRESSES
// ============================================================================

export const NOUNS_ADDRESSES = {
  // Core Contracts
  token: '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03' as const,
  auctionHouse: '0x830BD73E4184ceF73443C15111a1DF14e495C706' as const,
  governor: '0x6f3E6272A167e8AcCb32072d08E0957F9c79223d' as const,
  treasury: '0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71' as const,
  treasuryV1: '0x0BC3807Ec262cB779b38D65b38158acC3bfedE10' as const,
  descriptor: '0x33a9c445fb4fb21f2c030a6b2d3e2f12d017bfac' as const,
  
  // Governance Infrastructure
  data: '0xf790A5f59678dd733fb3De93493A91f472ca1365' as const,
  clientRewards: '0x883860178F95d0C82413eDc1D6De530cB4771d55' as const,
  
  // Financial Contracts
  tokenBuyer: '0x4f2acdc74f6941390d9b1804fabc3e780388cfe5' as const,
  payer: '0xd97Bcd9f47cEe35c0a9ec1dc40C1269afc9E8E1D' as const,
  streamFactory: '0x0fd206FC7A7dBcD5661157eDCb1FFDD0D02A61ff' as const,
  
  // Fork Contracts
  forkEscrow: '0x44d97D22B3d37d837cE4b22773aAd9d1566055D9' as const,
  forkDeployer: '0xcD65e61f70e0b1Aa433ca1d9A6FC2332e9e73cE3' as const,
} as const;

export type NounsContractName = keyof typeof NOUNS_ADDRESSES;

// ============================================================================
// MINIMAL ABIs - Only the functions we need
// ============================================================================

/**
 * Nouns Token ABI (minimal)
 */
export const NounsTokenABI = [
  // Read functions
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'seeds',
    outputs: [
      { name: 'background', type: 'uint48' },
      { name: 'body', type: 'uint48' },
      { name: 'accessory', type: 'uint48' },
      { name: 'head', type: 'uint48' },
      { name: 'glasses', type: 'uint48' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'getCurrentVotes',
    outputs: [{ name: '', type: 'uint96' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'delegator', type: 'address' }],
    name: 'delegates',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'dataURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [{ name: 'delegatee', type: 'address' }],
    name: 'delegate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * Auction House ABI (minimal)
 */
export const AuctionHouseABI = [
  // Read functions
  {
    inputs: [],
    name: 'auction',
    outputs: [
      { name: 'nounId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'bidder', type: 'address' },
      { name: 'settled', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'startId', type: 'uint256' },
      { name: 'endId', type: 'uint256' },
      { name: 'skipEmptyValues', type: 'bool' },
    ],
    name: 'getSettlements',
    outputs: [
      {
        components: [
          { name: 'blockTimestamp', type: 'uint32' },
          { name: 'amount', type: 'uint256' },
          { name: 'winner', type: 'address' },
          { name: 'nounId', type: 'uint256' },
          { name: 'clientId', type: 'uint32' },
        ],
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { name: 'nounId', type: 'uint256' },
      { name: 'clientId', type: 'uint32' },
    ],
    name: 'createBid',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'settleCurrentAndCreateNewAuction',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'nounId', type: 'uint256' },
      { indexed: false, name: 'sender', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
      { indexed: false, name: 'extended', type: 'bool' },
    ],
    name: 'AuctionBid',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'nounId', type: 'uint256' },
      { indexed: false, name: 'winner', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'AuctionSettled',
    type: 'event',
  },
] as const;

/**
 * Nouns DAO Governor ABI (minimal)
 */
export const NounsDAOABI = [
  // Read functions
  {
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    name: 'state',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    name: 'proposalsV3',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'proposer', type: 'address' },
          { name: 'proposalThreshold', type: 'uint256' },
          { name: 'quorumVotes', type: 'uint256' },
          { name: 'eta', type: 'uint256' },
          { name: 'startBlock', type: 'uint256' },
          { name: 'endBlock', type: 'uint256' },
          { name: 'forVotes', type: 'uint256' },
          { name: 'againstVotes', type: 'uint256' },
          { name: 'abstainVotes', type: 'uint256' },
          { name: 'canceled', type: 'bool' },
          { name: 'vetoed', type: 'bool' },
          { name: 'executed', type: 'bool' },
          { name: 'totalSupply', type: 'uint256' },
          { name: 'creationBlock', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    name: 'quorumVotes',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'proposalThreshold',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'adjustedTotalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'voter', type: 'address' },
    ],
    name: 'getReceipt',
    outputs: [
      {
        components: [
          { name: 'hasVoted', type: 'bool' },
          { name: 'support', type: 'uint8' },
          { name: 'votes', type: 'uint96' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions - Voting
  {
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'uint8' },
    ],
    name: 'castVote',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'uint8' },
      { name: 'reason', type: 'string' },
    ],
    name: 'castVoteWithReason',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'uint8' },
      { name: 'clientId', type: 'uint32' },
    ],
    name: 'castRefundableVote',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'uint8' },
      { name: 'reason', type: 'string' },
      { name: 'clientId', type: 'uint32' },
    ],
    name: 'castRefundableVoteWithReason',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Write functions - Proposals
  {
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'signatures', type: 'string[]' },
      { name: 'calldatas', type: 'bytes[]' },
      { name: 'description', type: 'string' },
      { name: 'clientId', type: 'uint32' },
    ],
    name: 'propose',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    name: 'queue',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    name: 'execute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    name: 'cancel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * Nouns DAO Data Contract ABI (candidates, feedback)
 */
export const NounsDAODataABI = [
  // Write functions - Candidates
  {
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'signatures', type: 'string[]' },
      { name: 'calldatas', type: 'bytes[]' },
      { name: 'description', type: 'string' },
      { name: 'slug', type: 'string' },
      { name: 'proposalIdToUpdate', type: 'uint256' },
    ],
    name: 'createProposalCandidate',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'signatures', type: 'string[]' },
      { name: 'calldatas', type: 'bytes[]' },
      { name: 'description', type: 'string' },
      { name: 'slug', type: 'string' },
      { name: 'proposalIdToUpdate', type: 'uint256' },
      { name: 'reason', type: 'string' },
    ],
    name: 'updateProposalCandidate',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'slug', type: 'string' }],
    name: 'cancelProposalCandidate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Write functions - Feedback
  {
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'uint8' },
      { name: 'reason', type: 'string' },
    ],
    name: 'sendFeedback',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'proposer', type: 'address' },
      { name: 'slug', type: 'string' },
      { name: 'support', type: 'uint8' },
      { name: 'reason', type: 'string' },
    ],
    name: 'sendCandidateFeedback',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Read functions
  {
    inputs: [],
    name: 'createCandidateCost',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'updateCandidateCost',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * ERC-20 ABI (minimal for balance reading)
 */
export const ERC20ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ============================================================================
// CONTRACT CONFIGS (address + abi combined)
// ============================================================================

export const NOUNS_CONTRACTS = {
  token: {
    address: NOUNS_ADDRESSES.token,
    abi: NounsTokenABI,
  },
  auctionHouse: {
    address: NOUNS_ADDRESSES.auctionHouse,
    abi: AuctionHouseABI,
  },
  governor: {
    address: NOUNS_ADDRESSES.governor,
    abi: NounsDAOABI,
  },
  data: {
    address: NOUNS_ADDRESSES.data,
    abi: NounsDAODataABI,
  },
} as const;

