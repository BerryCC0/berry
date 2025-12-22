# Berry OS - Nouns Integration

> Nouns DAO contracts, Goldsky subgraph, and app-specific integrations.

## Overview

Berry OS is built for the Nouns ecosystem. This document covers:
- Contract addresses and interactions
- Goldsky subgraph schema and queries
- Which apps use which contracts
- Transaction patterns

---

## Contracts

All contracts are on Ethereum Mainnet (Chain ID: 1).

### Core Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| **Nouns Token** | `0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03` | ERC721 token, delegations |
| **Auction House** | `0x830BD73E4184ceF73443C15111a1DF14e495C706` | Daily auctions |
| **DAO Governor** | `0x6f3E6272A167e8AcCb32072d08E0957F9c79223d` | Proposals, voting |
| **Treasury (Executor)** | `0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71` | Timelock, executes proposals |
| **Treasury V1** | `0x0BC3807Ec262cB779b38D65b38158acC3bfedE10` | Legacy treasury |
| **Descriptor v3** | `0x33a9c445fb4fb21f2c030a6b2d3e2f12d017bfac` | Traits, artwork rendering |

### Financial Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| **Token Buyer** | `0x4f2acdc74f6941390d9b1804fabc3e780388cfe5` | ETH → USDC conversion |
| **Payer** | `0xd97Bcd9f47cEe35c0a9ec1dc40C1269afc9E8E1D` | USDC payments |
| **Stream Factory** | `0x0fd206FC7A7dBcD5661157eDCb1FFDD0D02A61ff` | Payment streams |

### Governance Infrastructure

| Contract | Address | Purpose |
|----------|---------|---------|
| **Data** | `0xf790A5f59678dd733fb3De93493A91f472ca1365` | Candidates, feedback |
| **Client Rewards** | `0x883860178F95d0C82413eDc1D6De530cB4771d55` | Client incentives |

### Fork Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| **Fork Escrow** | `0x44d97D22B3d37d837cE4b22773aAd9d1566055D9` | Noun escrow for forks |
| **Fork DAO Deployer** | `0xcD65e61f70e0b1Aa433ca1d9A6FC2332e9e73cE3` | Deploy fork DAOs |

---

## Contract Configuration

```typescript
// /src/lib/nouns/contracts.ts

export const NOUNS_CONTRACTS = {
  token: {
    address: '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03' as const,
    abi: NounsTokenABI,
  },
  auctionHouse: {
    address: '0x830BD73E4184ceF73443C15111a1DF14e495C706' as const,
    abi: AuctionHouseABI,
  },
  governor: {
    address: '0x6f3E6272A167e8AcCb32072d08E0957F9c79223d' as const,
    abi: NounsDAOABI,
  },
  treasury: {
    address: '0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71' as const,
    abi: TreasuryABI,
  },
  treasuryV1: {
    address: '0x0BC3807Ec262cB779b38D65b38158acC3bfedE10' as const,
    abi: TreasuryV1ABI,
  },
  descriptor: {
    address: '0x33a9c445fb4fb21f2c030a6b2d3e2f12d017bfac' as const,
    abi: DescriptorV3ABI,
  },
  data: {
    address: '0xf790A5f59678dd733fb3De93493A91f472ca1365' as const,
    abi: NounsDAODataABI,
  },
  tokenBuyer: {
    address: '0x4f2acdc74f6941390d9b1804fabc3e780388cfe5' as const,
    abi: TokenBuyerABI,
  },
  payer: {
    address: '0xd97Bcd9f47cEe35c0a9ec1dc40C1269afc9E8E1D' as const,
    abi: PayerABI,
  },
  streamFactory: {
    address: '0x0fd206FC7A7dBcD5661157eDCb1FFDD0D02A61ff' as const,
    abi: StreamFactoryABI,
  },
  forkEscrow: {
    address: '0x44d97D22B3d37d837cE4b22773aAd9d1566055D9' as const,
    abi: ForkEscrowABI,
  },
  forkDeployer: {
    address: '0xcD65e61f70e0b1Aa433ca1d9A6FC2332e9e73cE3' as const,
    abi: ForkDAODeployerABI,
  },
  clientRewards: {
    address: '0x883860178F95d0C82413eDc1D6De530cB4771d55' as const,
    abi: ClientRewardsABI,
  },
} as const;

export type NounsContractName = keyof typeof NOUNS_CONTRACTS;
```

### ABI Storage

```
src/lib/nouns/
├── contracts.ts          # Contract addresses and config
├── abis/
│   ├── NounsToken.json
│   ├── AuctionHouse.json
│   ├── NounsDAO.json
│   ├── Treasury.json
│   ├── DescriptorV3.json
│   ├── NounsDAOData.json
│   ├── TokenBuyer.json
│   ├── Payer.json
│   ├── StreamFactory.json
│   ├── ForkEscrow.json
│   ├── ForkDAODeployer.json
│   └── ClientRewards.json
└── index.ts              # Re-exports
```

---

## Treasury Assets

The Treasury Dashboard tracks ETH, ERC-20 tokens, and Nouns NFTs held by the treasury.

### Token Addresses

```typescript
// /src/lib/nouns/treasury.ts

export const TREASURY_TOKENS = {
  // Native ETH tracked via balance
  
  // Liquid Staking Tokens
  wstETH: {
    address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0' as const,
    symbol: 'wstETH',
    decimals: 18,
    name: 'Wrapped stETH',
  },
  stETH: {
    address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84' as const,
    symbol: 'stETH',
    decimals: 18,
    name: 'Lido Staked ETH',
  },
  rETH: {
    address: '0xae78736Cd615f374D3085123A210448E74Fc6393' as const,
    symbol: 'rETH',
    decimals: 18,
    name: 'Rocket Pool ETH',
  },
  mETH: {
    address: '0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa' as const,
    symbol: 'mETH',
    decimals: 18,
    name: 'Mantle Staked ETH',
  },
  
  // Wrapped ETH
  WETH: {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as const,
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ether',
  },
  
  // Stablecoins
  USDC: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const,
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
  },
} as const;

export type TreasuryTokenSymbol = keyof typeof TREASURY_TOKENS;
```

### ERC-20 ABI (minimal for balance reading)

```typescript
// /src/lib/nouns/abis/ERC20.ts
export const ERC20_ABI = [
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
] as const;
```

### Treasury Balance Hook

```typescript
// /src/lib/nouns/hooks/useTreasuryBalances.ts
import { useReadContracts, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { NOUNS_CONTRACTS, TREASURY_TOKENS, ERC20_ABI } from '../contracts';

interface TreasuryBalances {
  eth: bigint;
  tokens: Record<string, { raw: bigint; formatted: string }>;
  isLoading: boolean;
  error: Error | null;
}

export function useTreasuryBalances(): TreasuryBalances {
  const treasuryAddress = NOUNS_CONTRACTS.treasury.address;
  
  // ETH balance
  const { data: ethBalance, isLoading: ethLoading } = useBalance({
    address: treasuryAddress,
  });
  
  // ERC-20 balances
  const tokenCalls = Object.entries(TREASURY_TOKENS).map(([symbol, token]) => ({
    address: token.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [treasuryAddress],
  }));
  
  const { data: tokenBalances, isLoading: tokensLoading } = useReadContracts({
    contracts: tokenCalls,
  });
  
  // Format results
  const tokens: Record<string, { raw: bigint; formatted: string }> = {};
  
  if (tokenBalances) {
    Object.keys(TREASURY_TOKENS).forEach((symbol, index) => {
      const result = tokenBalances[index];
      const tokenConfig = TREASURY_TOKENS[symbol as TreasuryTokenSymbol];
      
      if (result.status === 'success') {
        const raw = result.result as bigint;
        tokens[symbol] = {
          raw,
          formatted: formatUnits(raw, tokenConfig.decimals),
        };
      }
    });
  }
  
  return {
    eth: ethBalance?.value ?? 0n,
    tokens,
    isLoading: ethLoading || tokensLoading,
    error: null,
  };
}
```

### Treasury Nouns

Track Nouns NFTs owned by the treasury:

```typescript
// /src/lib/nouns/hooks/useTreasuryNouns.ts
import { useNounsQuery } from './useNounsQuery';

interface TreasuryNoun {
  id: string;
  seed: {
    background: number;
    body: number;
    accessory: number;
    head: number;
    glasses: number;
  };
}

export function useTreasuryNouns() {
  const treasuryAddress = NOUNS_CONTRACTS.treasury.address.toLowerCase();
  
  return useNounsQuery<{ nouns: TreasuryNoun[] }>(
    ['treasury-nouns'],
    `
      query TreasuryNouns($owner: ID!) {
        nouns(where: { owner: $owner }, orderBy: id, orderDirection: desc) {
          id
          seed {
            background
            body
            accessory
            head
            glasses
          }
        }
      }
    `,
    { owner: treasuryAddress }
  );
}
```

### Treasury Dashboard Data

Combined hook for dashboard:

```typescript
// /src/lib/nouns/hooks/useTreasuryDashboard.ts
import { useTreasuryBalances } from './useTreasuryBalances';
import { useTreasuryNouns } from './useTreasuryNouns';
import { formatEther } from 'viem';

export function useTreasuryDashboard() {
  const balances = useTreasuryBalances();
  const { data: nounsData, isLoading: nounsLoading } = useTreasuryNouns();
  
  // Calculate total ETH value (ETH + staking derivatives)
  const ethEquivalent = 
    balances.eth +
    (balances.tokens.wstETH?.raw ?? 0n) +
    (balances.tokens.stETH?.raw ?? 0n) +
    (balances.tokens.rETH?.raw ?? 0n) +
    (balances.tokens.mETH?.raw ?? 0n) +
    (balances.tokens.WETH?.raw ?? 0n);
  
  return {
    // Balances
    eth: {
      raw: balances.eth,
      formatted: formatEther(balances.eth),
    },
    tokens: balances.tokens,
    ethEquivalent: {
      raw: ethEquivalent,
      formatted: formatEther(ethEquivalent),
    },
    
    // Nouns
    nouns: nounsData?.nouns ?? [],
    nounCount: nounsData?.nouns.length ?? 0,
    
    // Loading state
    isLoading: balances.isLoading || nounsLoading,
  };
}
```

### Treasury Dashboard Component

```typescript
// Example usage in Treasury Dashboard app
const TreasuryDashboard = () => {
  const { 
    eth, 
    tokens, 
    ethEquivalent, 
    nouns, 
    nounCount,
    isLoading 
  } = useTreasuryDashboard();
  
  if (isLoading) return <Loading />;
  
  return (
    <div>
      <h2>Treasury Balances</h2>
      
      {/* ETH */}
      <div>
        <span>ETH</span>
        <span>{eth.formatted} ETH</span>
      </div>
      
      {/* Staking Tokens */}
      <div>
        <span>wstETH</span>
        <span>{tokens.wstETH?.formatted ?? '0'}</span>
      </div>
      <div>
        <span>stETH</span>
        <span>{tokens.stETH?.formatted ?? '0'}</span>
      </div>
      <div>
        <span>rETH</span>
        <span>{tokens.rETH?.formatted ?? '0'}</span>
      </div>
      <div>
        <span>mETH</span>
        <span>{tokens.mETH?.formatted ?? '0'}</span>
      </div>
      <div>
        <span>WETH</span>
        <span>{tokens.WETH?.formatted ?? '0'}</span>
      </div>
      
      {/* Stablecoins */}
      <div>
        <span>USDC</span>
        <span>{tokens.USDC?.formatted ?? '0'}</span>
      </div>
      
      {/* Total ETH Equivalent */}
      <div>
        <strong>Total ETH Equivalent</strong>
        <span>{ethEquivalent.formatted} ETH</span>
      </div>
      
      {/* Nouns */}
      <h2>Treasury Nouns ({nounCount})</h2>
      <div className="noun-grid">
        {nouns.map(noun => (
          <CachedNounImage key={noun.id} id={parseInt(noun.id)} size={64} />
        ))}
      </div>
    </div>
  );
};
```

### V1 Treasury

Don't forget to also check the V1 treasury for legacy assets:

```typescript
export function useTreasuryV1Balances() {
  const treasuryV1Address = NOUNS_CONTRACTS.treasuryV1.address;
  
  // Same pattern as useTreasuryBalances but with V1 address
  // ...
}

// Combined view
export function useAllTreasuryBalances() {
  const v2 = useTreasuryBalances();
  const v1 = useTreasuryV1Balances();
  
  return {
    v1,
    v2,
    combined: {
      eth: v1.eth + v2.eth,
      // ... combine all tokens
    },
  };
}
```

### When to Use Each

| Source | Use For | Examples |
|--------|---------|----------|
| **Goldsky** | Historical data, lists, aggregations | Proposal list, vote history, past auctions |
| **Direct RPC Read** | Current state, real-time data | Current auction, live vote counts |
| **Direct RPC Write** | All transactions | Bid, vote, propose, delegate |

### Decision Flow

```
Need Nouns data?
    │
    ├─ Historical / list / aggregation?
    │   └─► Goldsky subgraph
    │
    ├─ Current state that changes frequently?
    │   └─► Direct contract read (+ polling or WebSocket)
    │
    └─ User action / transaction?
        └─► Direct contract write (useWriteContract)
```

---

## Goldsky Subgraph

### Endpoint

```typescript
const GOLDSKY_ENDPOINT = 'https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn';
```

### Core Entities

#### Noun & Token

```graphql
type Noun {
  id: ID!                    # Token ID
  seed: Seed                 # Trait indices
  owner: Account!
  votes: [Vote!]!
}

type Seed {
  id: ID!                    # Token ID
  background: BigInt!
  body: BigInt!
  accessory: BigInt!
  head: BigInt!
  glasses: BigInt!
}

type Account {
  id: ID!                    # Address
  delegate: Delegate
  tokenBalance: BigInt!
  nouns: [Noun!]!
}

type Delegate {
  id: ID!                    # Address
  delegatedVotes: BigInt!
  nounsRepresented: [Noun!]!
  votes: [Vote!]!
  proposals: [Proposal!]!
}
```

#### Auction

```graphql
type Auction {
  id: ID!                    # Token ID
  noun: Noun!
  amount: BigInt!            # Current highest bid (wei)
  startTime: BigInt!
  endTime: BigInt!
  bidder: Account            # Current highest bidder
  settled: Boolean!
  bids: [Bid!]!
  clientId: Int!
}

type Bid {
  id: ID!                    # noun.id-amount
  noun: Noun!
  amount: BigInt!
  bidder: Account
  auction: Auction!
  blockTimestamp: BigInt!
  clientId: Int
}
```

#### Governance

```graphql
type Proposal {
  id: ID!                    # Proposal number
  proposer: Delegate!
  signers: [Delegate!]       # Co-signers
  targets: [Bytes!]
  values: [BigInt!]
  signatures: [String!]
  calldatas: [Bytes!]
  title: String!
  description: String!
  status: ProposalStatus
  forVotes: BigInt!
  againstVotes: BigInt!
  abstainVotes: BigInt!
  startBlock: BigInt!
  endBlock: BigInt!
  executionETA: BigInt
  votes: [Vote!]!
  feedbackPosts: [ProposalFeedback!]!
  clientId: Int!
}

enum ProposalStatus {
  PENDING
  ACTIVE
  CANCELLED
  VETOED
  QUEUED
  EXECUTED
}

type Vote {
  id: ID!                    # delegate.id-proposal.id
  support: Boolean!
  supportDetailed: Int!      # 0=against, 1=for, 2=abstain
  votes: BigInt!
  reason: String
  voter: Delegate!
  nouns: [Noun!]
  proposal: Proposal!
  blockTimestamp: BigInt!
  clientId: Int!
}

type ProposalFeedback {
  id: ID!
  proposal: Proposal!
  voter: Delegate!
  supportDetailed: Int!
  votes: BigInt!
  reason: String
  createdTimestamp: BigInt!
}
```

#### Candidates

```graphql
type ProposalCandidate {
  id: ID!                    # proposer-slug
  proposer: Bytes!
  slug: String!
  canceled: Boolean!
  latestVersion: ProposalCandidateVersion!
  versions: [ProposalCandidateVersion!]!
  createdTimestamp: BigInt!
}

type ProposalCandidateVersion {
  id: ID!
  proposal: ProposalCandidate!
  content: ProposalCandidateContent!
  updateMessage: String!
  createdTimestamp: BigInt!
}

type ProposalCandidateContent {
  id: ID!                    # Encoded proposal hash
  title: String!
  description: String!
  targets: [Bytes!]
  values: [BigInt!]
  signatures: [String!]
  calldatas: [Bytes!]
  contentSignatures: [ProposalCandidateSignature!]!
}

type ProposalCandidateSignature {
  id: ID!
  content: ProposalCandidateContent!
  signer: Delegate!
  reason: String!
  canceled: Boolean!
  expirationTimestamp: BigInt!
}

type CandidateFeedback {
  id: ID!
  candidate: ProposalCandidate!
  voter: Delegate!
  supportDetailed: Int!
  votes: BigInt!
  reason: String
  createdTimestamp: BigInt!
}
```

#### Fork

```graphql
type Fork {
  id: ID!                    # Fork ID
  forkID: BigInt!
  tokensInEscrowCount: Int!
  tokensForkingCount: Int!
  executed: Boolean
  executedAt: BigInt
  forkTreasury: Bytes
  forkToken: Bytes
  escrowedNouns: [EscrowedNoun!]!
  joinedNouns: [ForkJoinedNoun!]!
}

type EscrowedNoun {
  id: ID!
  fork: Fork!
  noun: Noun!
  owner: Delegate!
}
```

---

## Common Queries

### Current Auction

```graphql
query CurrentAuction {
  auctions(first: 1, orderBy: startTime, orderDirection: desc) {
    id
    amount
    startTime
    endTime
    bidder {
      id
    }
    settled
    noun {
      id
      seed {
        background
        body
        accessory
        head
        glasses
      }
    }
    bids(orderBy: amount, orderDirection: desc) {
      amount
      bidder {
        id
      }
      blockTimestamp
    }
  }
}
```

### Proposals List

```graphql
query Proposals($first: Int!, $skip: Int!) {
  proposals(
    first: $first
    skip: $skip
    orderBy: createdBlock
    orderDirection: desc
  ) {
    id
    title
    status
    proposer {
      id
    }
    forVotes
    againstVotes
    abstainVotes
    startBlock
    endBlock
    createdTimestamp
  }
}
```

### Single Proposal with Votes

```graphql
query Proposal($id: ID!) {
  proposal(id: $id) {
    id
    title
    description
    status
    proposer {
      id
    }
    forVotes
    againstVotes
    abstainVotes
    quorumVotes
    startBlock
    endBlock
    executionETA
    votes(orderBy: blockTimestamp, orderDirection: desc) {
      voter {
        id
        delegatedVotes
      }
      supportDetailed
      votes
      reason
      blockTimestamp
    }
    feedbackPosts(orderBy: createdTimestamp, orderDirection: desc) {
      voter {
        id
      }
      supportDetailed
      votes
      reason
      createdTimestamp
    }
  }
}
```

### Delegate Profile

```graphql
query Delegate($id: ID!) {
  delegate(id: $id) {
    id
    delegatedVotes
    nounsRepresented {
      id
    }
    votes(orderBy: blockNumber, orderDirection: desc) {
      proposal {
        id
        title
      }
      supportDetailed
      votes
      reason
    }
    proposals {
      id
      title
      status
    }
  }
}
```

### Proposal Candidates

```graphql
query Candidates($first: Int!) {
  proposalCandidates(
    first: $first
    where: { canceled: false }
    orderBy: createdTimestamp
    orderDirection: desc
  ) {
    id
    proposer
    slug
    createdTimestamp
    latestVersion {
      content {
        title
        description
        contentSignatures {
          signer {
            id
            delegatedVotes
          }
          canceled
        }
      }
    }
  }
}
```

### Account Nouns & Delegation

```graphql
query Account($id: ID!) {
  account(id: $id) {
    id
    tokenBalance
    nouns {
      id
      seed {
        background
        body
        accessory
        head
        glasses
      }
    }
    delegate {
      id
      delegatedVotes
    }
  }
}
```

---

## App Integrations

### Auction App

**Contracts:**
- Auction House (read auction state, place bids)
- Token (noun ownership)
- Descriptor (render noun artwork)

**Data Sources:**
- Goldsky: Historical auctions, bid history
- Direct read: Current auction state (polling every block)
- Direct write: `createBid(nounId, clientId)`

```typescript
// Read current auction
const { data: auction } = useReadContract({
  ...NOUNS_CONTRACTS.auctionHouse,
  functionName: 'auction',
});

// Place bid
const { writeContract } = useWriteContract();

const placeBid = (nounId: bigint) => {
  writeContract({
    ...NOUNS_CONTRACTS.auctionHouse,
    functionName: 'createBid',
    args: [nounId, CLIENT_ID],
    value: bidAmount,
  });
};
```

### Camp (Proposal Editor + Delegation)

**Contracts:**
- DAO Governor (proposals, voting)
- Data (candidates, feedback)
- Token (delegation, transfers)

**Data Sources:**
- Goldsky: Proposals list, votes, candidates, feedback
- Direct read: Current vote counts, proposal state
- Direct write: All governance actions

#### Governor Contract Transactions

##### Proposal Creation

```typescript
// Standard proposal (V2 timelock)
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'propose',
  args: [targets, values, signatures, calldatas, description, BERRY_CLIENT_ID],
});

// Proposal on V1 timelock (legacy treasury)
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'proposeOnTimelockV1',
  args: [targets, values, signatures, calldatas, description, BERRY_CLIENT_ID],
});

// Proposal with co-signer signatures
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'proposeBySigs',
  args: [proposerSignatures, targets, values, signatures, calldatas, description, BERRY_CLIENT_ID],
});
```

##### Voting

```typescript
// Simple vote (no gas refund)
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'castVote',
  args: [proposalId, support], // support: 0=against, 1=for, 2=abstain
});

// Vote with reason (no gas refund)
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'castVoteWithReason',
  args: [proposalId, support, reason],
});

// Refundable vote (gas refunded from treasury)
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'castRefundableVote',
  args: [proposalId, support, BERRY_CLIENT_ID],
});

// Refundable vote with reason (RECOMMENDED)
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'castRefundableVoteWithReason',
  args: [proposalId, support, reason, BERRY_CLIENT_ID],
});

// Vote by signature (gasless for voter)
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'castVoteBySig',
  args: [proposalId, support, v, r, s],
});
```

##### Proposal Lifecycle

```typescript
// Cancel proposal (proposer only, or if proposer below threshold)
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'cancel',
  args: [proposalId],
});

// Queue successful proposal for execution
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'queue',
  args: [proposalId],
});

// Execute queued proposal (after timelock delay)
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'execute',
  args: [proposalId],
});
```

##### Proposal Updates (during update period)

```typescript
// Update proposal transactions and description
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'updateProposal',
  args: [proposalId, targets, values, signatures, calldatas, description, updateMessage],
});

// Update only proposal description
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'updateProposalDescription',
  args: [proposalId, description, updateMessage],
});

// Update only proposal transactions
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'updateProposalTransactions',
  args: [proposalId, targets, values, signatures, calldatas, updateMessage],
});

// Update proposal with co-signer signatures
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'updateProposalBySigs',
  args: [proposalId, proposerSignatures, targets, values, signatures, calldatas, description, updateMessage],
});
```

##### Fork Operations

```typescript
// Escrow Nouns to signal fork intent
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'escrowToFork',
  args: [tokenIds, proposalIds, reason],
});

// Withdraw from fork escrow (before fork executes)
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'withdrawFromForkEscrow',
  args: [tokenIds],
});

// Join an executed fork
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'joinFork',
  args: [tokenIds, proposalIds, reason],
});

// Execute fork (when threshold met)
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'executeFork',
});
```

##### Signature Management

```typescript
// Cancel a previously submitted signature
writeContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'cancelSig',
  args: [sig],
});
```

#### Data Contract Transactions (Candidates & Feedback)

##### Candidates

```typescript
// Create a new proposal candidate
writeContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'createProposalCandidate',
  args: [targets, values, signatures, calldatas, description, slug, proposalIdToUpdate],
});

// Update an existing candidate
writeContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'updateProposalCandidate',
  args: [targets, values, signatures, calldatas, description, slug, proposalIdToUpdate, reason],
});

// Cancel a candidate
writeContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'cancelProposalCandidate',
  args: [slug],
});

// Add sponsor signature to candidate
writeContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'addSignature',
  args: [sig, expirationTimestamp, proposer, slug, proposalIdToUpdate, encodedProp, reason],
});
```

##### Feedback

```typescript
// Send feedback on a proposal
writeContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'sendFeedback',
  args: [proposalId, support, reason],
});

// Send feedback on a candidate
writeContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'sendCandidateFeedback',
  args: [proposer, slug, support, reason],
});
```

#### Token Contract Transactions

##### Delegation

```typescript
// Delegate voting power to another address
writeContract({
  ...NOUNS_CONTRACTS.token,
  functionName: 'delegate',
  args: [delegateeAddress],
});

// Delegate by signature (gasless for delegator)
writeContract({
  ...NOUNS_CONTRACTS.token,
  functionName: 'delegateBySig',
  args: [delegatee, nonce, expiry, v, r, s],
});
```

##### Transfers

```typescript
// Transfer a Noun
writeContract({
  ...NOUNS_CONTRACTS.token,
  functionName: 'transferFrom',
  args: [from, to, tokenId],
});

// Safe transfer (checks receiver can handle NFT)
writeContract({
  ...NOUNS_CONTRACTS.token,
  functionName: 'safeTransferFrom',
  args: [from, to, tokenId],
});

// Safe transfer with data
writeContract({
  ...NOUNS_CONTRACTS.token,
  functionName: 'safeTransferFrom',
  args: [from, to, tokenId, data],
});
```

##### Approvals

```typescript
// Approve single token
writeContract({
  ...NOUNS_CONTRACTS.token,
  functionName: 'approve',
  args: [to, tokenId],
});

// Approve operator for all tokens
writeContract({
  ...NOUNS_CONTRACTS.token,
  functionName: 'setApprovalForAll',
  args: [operator, approved],
});
```

#### Token Contract Reads

```typescript
// Get current votes for an address
const votes = await readContract({
  ...NOUNS_CONTRACTS.token,
  functionName: 'getCurrentVotes',
  args: [account],
});

// Get votes at a specific block (for historical checks)
const priorVotes = await readContract({
  ...NOUNS_CONTRACTS.token,
  functionName: 'getPriorVotes',
  args: [account, blockNumber],
});

// Get delegate for an address
const delegate = await readContract({
  ...NOUNS_CONTRACTS.token,
  functionName: 'delegates',
  args: [delegator],
});

// Get Noun seed (for rendering)
const seed = await readContract({
  ...NOUNS_CONTRACTS.token,
  functionName: 'seeds',
  args: [tokenId],
});

// Get total supply
const totalSupply = await readContract({
  ...NOUNS_CONTRACTS.token,
  functionName: 'totalSupply',
});

// Get Noun owner
const owner = await readContract({
  ...NOUNS_CONTRACTS.token,
  functionName: 'ownerOf',
  args: [tokenId],
});

// Get balance of address
const balance = await readContract({
  ...NOUNS_CONTRACTS.token,
  functionName: 'balanceOf',
  args: [account],
});

// Get on-chain metadata + SVG
const dataURI = await readContract({
  ...NOUNS_CONTRACTS.token,
  functionName: 'dataURI',
  args: [tokenId],
});
```

#### Governor Contract Reads

```typescript
// Get proposal state
const state = await readContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'state',
  args: [proposalId],
});
// Returns: 0=Pending, 1=Active, 2=Canceled, 3=Defeated, 4=Succeeded, 5=Queued, 6=Expired, 7=Executed, 8=Vetoed

// Get proposal details (V3 format with all fields)
const proposal = await readContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'proposalsV3',
  args: [proposalId],
});

// Get proposal actions
const actions = await readContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'getActions',
  args: [proposalId],
});

// Get quorum for proposal
const quorum = await readContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'quorumVotes',
  args: [proposalId],
});

// Get vote receipt
const receipt = await readContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'getReceipt',
  args: [proposalId, voter],
});

// Get proposal threshold (votes needed to propose)
const threshold = await readContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'proposalThreshold',
});

// Get adjusted total supply (excludes burned/escrowed)
const adjustedSupply = await readContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'adjustedTotalSupply',
});

// Get fork escrow count
const escrowCount = await readContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'numTokensInForkEscrow',
});

// Get fork threshold
const forkThreshold = await readContract({
  ...NOUNS_CONTRACTS.governor,
  functionName: 'forkThreshold',
});
```

#### Candidate Sponsorship Flow

Candidates can be sponsored by delegates who sign the proposal content:

```typescript
// 1. Signer signs the candidate content (off-chain)
const signature = await signTypedData({
  // EIP-712 typed data for candidate sponsorship
});

// 2. Submit signature to chain
writeContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'addSignature',
  args: [
    sig,
    expirationTimestamp,
    proposer,
    slug,
    proposalIdToUpdate,
    encodedProp,
    reason,
  ],
});
```

### DUNA Admin

The DUNA (Decentralized Unincorporated Nonprofit Association) Admin has special oversight capabilities for compliance signaling and messaging.

**Contract:** Data Proxy (`0xf790A5f59678dd733fb3De93493A91f472ca1365`)

#### DUNA Admin Transactions

```typescript
// Post a message from DUNA Admin (compliance guidance, announcements)
writeContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'postDunaAdminMessage',
  args: [message, relatedProposalIds], // relatedProposalIds: uint256[]
});

// Signal compliance status on a proposal
writeContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'signalProposalCompliance',
  args: [proposalId, signal, reason], // signal: 0=non-compliant, 1=compliant, 2=unclear
});

// Set a new DUNA Admin address (owner or current admin only)
writeContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'setDunaAdmin',
  args: [newDunaAdminAddress],
});
```

#### Voter → DUNA Admin Communication

```typescript
// Any voter can send a message to the DUNA Admin
writeContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'postVoterMessageToDunaAdmin',
  args: [message, relatedProposalIds],
});
```

#### Data Contract Admin Functions

```typescript
// Set candidate creation cost (owner only)
writeContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'setCreateCandidateCost',
  args: [newCostInWei],
});

// Set candidate update cost (owner only)
writeContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'setUpdateCandidateCost',
  args: [newCostInWei],
});

// Set fee recipient for candidate fees (owner only)
writeContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'setFeeRecipient',
  args: [newFeeRecipientAddress],
});

// Withdraw collected ETH fees (owner only)
writeContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'withdrawETH',
  args: [toAddress, amountInWei],
});
```

#### Data Contract Reads

```typescript
// Get current DUNA Admin address
const dunaAdmin = await readContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'dunaAdmin',
});

// Get candidate creation cost
const createCost = await readContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'createCandidateCost',
});

// Get candidate update cost
const updateCost = await readContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'updateCandidateCost',
});

// Get fee recipient address
const feeRecipient = await readContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'feeRecipient',
});

// Check if a candidate exists
const exists = await readContract({
  ...NOUNS_CONTRACTS.data,
  functionName: 'propCandidates',
  args: [proposerAddress, encodedProposalHash],
});
```

#### Data Source Note

DUNA Admin events (`DunaAdminMessagePosted`, `VoterMessageToDunaAdminPosted`, `ProposalComplianceSignaled`) are **not indexed by the Goldsky subgraph**. To display historical DUNA messaging:

1. **Query event logs directly** via RPC for real-time/recent data
2. **Store in our Neon database** if we need historical records

```typescript
// Query recent DUNA Admin messages from chain
const dunaMessages = await client.getLogs({
  address: NOUNS_CONTRACTS.data.address,
  event: {
    type: 'event',
    name: 'DunaAdminMessagePosted',
    inputs: [
      { type: 'string', name: 'message', indexed: false },
      { type: 'uint256[]', name: 'relatedProposals', indexed: false },
    ],
  },
  fromBlock: startBlock,
  toBlock: 'latest',
});

// Query compliance signals for a specific proposal
const complianceSignals = await client.getLogs({
  address: NOUNS_CONTRACTS.data.address,
  event: {
    type: 'event',
    name: 'ProposalComplianceSignaled',
    inputs: [
      { type: 'uint256', name: 'proposalId', indexed: true },
      { type: 'uint8', name: 'signal', indexed: false },
      { type: 'string', name: 'reason', indexed: false },
    ],
  },
  args: {
    proposalId: BigInt(proposalId),
  },
  fromBlock: 'earliest',
});
```

#### Compliance Signal Values

| Value | Meaning |
|-------|---------|
| 0 | Non-compliant |
| 1 | Compliant |
| 2 | Unclear / Needs Review |

### Treasury Dashboard

**Contracts:**
- Treasury (balances, pending transactions)
- Payer (USDC payments)
- Token Buyer (ETH → USDC)

**Data Sources:**
- Goldsky: Historical transactions
- Direct read: Current balances, pending executions
- Direct write: Generally admin-only (executed via proposals)

```typescript
// Read treasury ETH balance
const { data: ethBalance } = useBalance({
  address: NOUNS_CONTRACTS.treasury.address,
});

// Read pending transactions (queued proposals)
const { data: queuedTxs } = useReadContract({
  ...NOUNS_CONTRACTS.treasury,
  functionName: 'queuedTransactions',
  args: [txHash],
});
```

---

## Hooks Pattern

### Goldsky Query Hook

```typescript
// /src/lib/nouns/hooks/useNounsQuery.ts
import { useQuery } from '@tanstack/react-query';

const GOLDSKY_ENDPOINT = 'https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn';

export function useNounsQuery<T>(
  queryKey: string[],
  query: string,
  variables?: Record<string, unknown>
) {
  return useQuery({
    queryKey: ['nouns', ...queryKey],
    queryFn: async () => {
      const response = await fetch(GOLDSKY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      
      const json = await response.json();
      
      if (json.errors) {
        throw new Error(json.errors[0].message);
      }
      
      return json.data as T;
    },
  });
}
```

### Contract Read Hooks

```typescript
// /src/lib/nouns/hooks/useAuction.ts
import { useReadContract, useWatchContractEvent } from 'wagmi';

export function useCurrentAuction() {
  const { data, refetch } = useReadContract({
    ...NOUNS_CONTRACTS.auctionHouse,
    functionName: 'auction',
  });
  
  // Refetch on new bid
  useWatchContractEvent({
    ...NOUNS_CONTRACTS.auctionHouse,
    eventName: 'AuctionBid',
    onLogs: () => refetch(),
  });
  
  return data;
}
```

### Contract Write Hooks

```typescript
// /src/lib/nouns/hooks/useVote.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

export function useVote() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  
  const vote = (proposalId: bigint, support: number, reason: string) => {
    writeContract({
      ...NOUNS_CONTRACTS.governor,
      functionName: 'castRefundableVoteWithReason',
      args: [proposalId, support, reason, CLIENT_ID],
    });
  };
  
  return {
    vote,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}
```

---

## Client ID

Berry OS is registered with Client ID **11** for client rewards:

```typescript
// /src/lib/nouns/constants.ts
export const BERRY_CLIENT_ID = 11;

// Include in all transactions
writeContract({
  functionName: 'createBid',
  args: [nounId, BERRY_CLIENT_ID],  // Always include clientId
});
```

---

## Noun Database Cache

We cache all Nouns in our Neon database for fast access without RPC calls or subgraph queries.

### Schema

```sql
-- All historical Nouns with pre-rendered SVGs
CREATE TABLE nouns (
  id INTEGER PRIMARY KEY,                    -- Token ID
  
  -- Seed traits
  background INTEGER NOT NULL,
  body INTEGER NOT NULL,
  accessory INTEGER NOT NULL,
  head INTEGER NOT NULL,
  glasses INTEGER NOT NULL,
  
  -- Pre-rendered SVG (avoid client-side rendering)
  svg TEXT NOT NULL,
  
  -- Settler info (who called settleCurrentAndCreateNewAuction)
  settled_by_address VARCHAR(42) NOT NULL,   -- Address that settled the auction
  settled_by_ens VARCHAR(255),               -- ENS name (if resolved)
  settled_at TIMESTAMP NOT NULL,             -- When auction was settled
  settled_tx_hash VARCHAR(66) NOT NULL,      -- Transaction hash
  
  -- Auction winner (who won the bid)
  winning_bid NUMERIC(78, 0),                -- Wei (NULL for Nounder nouns)
  winner_address VARCHAR(42),                -- Winning bidder address
  winner_ens VARCHAR(255),                   -- Winner's ENS (if resolved)
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_nouns_settled_at ON nouns(settled_at DESC);
CREATE INDEX idx_nouns_settler ON nouns(settled_by_address);
CREATE INDEX idx_nouns_winner ON nouns(winner_address);
```

**Note:** The settler and winner are different people:
- **Settler**: Called `settleCurrentAndCreateNewAuction()` to end the auction and mint the next Noun
- **Winner**: Had the highest bid and receives the Noun
```

### API Route: Get Noun

```typescript
// /app/api/nouns/[id]/route.ts
import { sql } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  
  if (isNaN(id) || id < 0) {
    return Response.json({ error: 'Invalid noun ID' }, { status: 400 });
  }
  
  const result = await sql`
    SELECT * FROM nouns WHERE id = ${id}
  `;
  
  if (result.length === 0) {
    return Response.json({ error: 'Noun not found' }, { status: 404 });
  }
  
  return Response.json(result[0]);
}
```

### API Route: List Nouns

```typescript
// /app/api/nouns/route.ts
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  
  const nouns = await sql`
    SELECT id, background, body, accessory, head, glasses, 
           settled_by_address, settled_by_ens, settled_at,
           winning_bid, winner_address, winner_ens
    FROM nouns
    ORDER BY id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  
  // Get total count
  const [{ count }] = await sql`SELECT COUNT(*) as count FROM nouns`;
  
  return Response.json({ nouns, total: count });
}
```

### Cron Job: Sync New Nouns

Triggered when a new auction starts (daily). Uses Vercel Cron.

```typescript
// /app/api/cron/sync-nouns/route.ts
import { sql } from '@/lib/db';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { NOUNS_CONTRACTS, BERRY_CLIENT_ID } from '@/lib/nouns';
import { renderNounSVG } from '@/lib/nouns/render';
import { normalize } from 'viem/ens';

const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.RPC_URL),
});

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get latest noun ID from our database
    const [latest] = await sql`
      SELECT COALESCE(MAX(id), -1) as max_id FROM nouns
    `;
    const lastStoredId = latest.max_id;
    
    // Get current auction from contract
    const auction = await client.readContract({
      ...NOUNS_CONTRACTS.auctionHouse,
      functionName: 'auction',
    });
    
    const currentNounId = Number(auction.nounId);
    
    // Sync any missing nouns (current auction noun doesn't exist yet)
    const nounsToSync = [];
    for (let id = lastStoredId + 1; id < currentNounId; id++) {
      nounsToSync.push(id);
    }
    
    if (nounsToSync.length === 0) {
      return Response.json({ message: 'No new nouns to sync', lastStoredId });
    }
    
    // Fetch and store each noun
    const results = await Promise.all(
      nounsToSync.map(id => syncNoun(id))
    );
    
    return Response.json({ 
      message: `Synced ${results.length} nouns`,
      synced: results.map(r => r.id),
    });
  } catch (error) {
    console.error('Noun sync failed:', error);
    return Response.json({ error: 'Sync failed' }, { status: 500 });
  }
}

async function syncNoun(nounId: number) {
  // Get seed from token contract
  const seed = await client.readContract({
    ...NOUNS_CONTRACTS.token,
    functionName: 'seeds',
    args: [BigInt(nounId)],
  });
  
  // Get settlement transaction from Goldsky
  const settleInfo = await getSettlementInfo(nounId);
  
  // Render SVG
  const svg = renderNounSVG({
    background: Number(seed.background),
    body: Number(seed.body),
    accessory: Number(seed.accessory),
    head: Number(seed.head),
    glasses: Number(seed.glasses),
  });
  
  // Resolve ENS names
  const settlerEns = await resolveEns(settleInfo.settlerAddress);
  const winnerEns = settleInfo.winnerAddress 
    ? await resolveEns(settleInfo.winnerAddress)
    : null;
  
  // Insert into database
  await sql`
    INSERT INTO nouns (
      id, background, body, accessory, head, glasses, svg,
      settled_by_address, settled_by_ens, settled_at, settled_tx_hash,
      winning_bid, winner_address, winner_ens
    ) VALUES (
      ${nounId},
      ${Number(seed.background)},
      ${Number(seed.body)},
      ${Number(seed.accessory)},
      ${Number(seed.head)},
      ${Number(seed.glasses)},
      ${svg},
      ${settleInfo.settlerAddress},
      ${settlerEns},
      ${settleInfo.settledAt},
      ${settleInfo.txHash},
      ${settleInfo.winningBid},
      ${settleInfo.winnerAddress},
      ${winnerEns}
    )
    ON CONFLICT (id) DO UPDATE SET
      settled_by_ens = EXCLUDED.settled_by_ens,
      winner_ens = EXCLUDED.winner_ens,
      updated_at = NOW()
  `;
  
  return { id: nounId };
}

async function getSettlementInfo(nounId: number) {
  // Get settlement data from contract (includes winner, amount, timestamp)
  const settlements = await client.readContract({
    ...NOUNS_CONTRACTS.auctionHouse,
    functionName: 'getSettlements',
    args: [BigInt(nounId), BigInt(nounId + 1), false],
  });
  
  const settlement = settlements[0];
  
  if (!settlement || settlement.nounId === 0n) {
    // Nounder noun (every 10th) - no auction
    return await getNounderNounInfo(nounId);
  }
  
  // Get the settle transaction to find who called it
  // Query for AuctionSettled event
  const settledLogs = await client.getLogs({
    address: NOUNS_CONTRACTS.auctionHouse.address,
    event: {
      type: 'event',
      name: 'AuctionSettled',
      inputs: [
        { type: 'uint256', name: 'nounId', indexed: true },
        { type: 'address', name: 'winner', indexed: false },
        { type: 'uint256', name: 'amount', indexed: false },
      ],
    },
    args: {
      nounId: BigInt(nounId),
    },
    fromBlock: 'earliest',
  });
  
  if (settledLogs.length === 0) {
    throw new Error(`No AuctionSettled event found for Noun ${nounId}`);
  }
  
  const settleLog = settledLogs[0];
  
  // Get the transaction to find the settler (tx.from)
  const tx = await client.getTransaction({ hash: settleLog.transactionHash });
  const block = await client.getBlock({ blockHash: settleLog.blockHash });
  
  return {
    // Settler = who initiated the settleCurrentAndCreateNewAuction tx
    settlerAddress: tx.from,
    settledAt: new Date(Number(block.timestamp) * 1000),
    txHash: settleLog.transactionHash,
    // Winner = who won the auction (from settlement data)
    winningBid: settlement.amount.toString(),
    winnerAddress: settlement.winner,
  };
}

async function getNounderNounInfo(nounId: number) {
  // Nounder nouns are minted directly, no auction
  // Get from Transfer event
  const logs = await client.getLogs({
    address: NOUNS_CONTRACTS.token.address,
    event: {
      type: 'event',
      name: 'Transfer',
      inputs: [
        { type: 'address', name: 'from', indexed: true },
        { type: 'address', name: 'to', indexed: true },
        { type: 'uint256', name: 'tokenId', indexed: true },
      ],
    },
    args: {
      tokenId: BigInt(nounId),
    },
    fromBlock: 'earliest',
  });
  
  const mintLog = logs[0];
  const block = await client.getBlock({ blockHash: mintLog.blockHash });
  const tx = await client.getTransaction({ hash: mintLog.transactionHash });
  
  return {
    settlerAddress: tx.from,
    settledAt: new Date(Number(block.timestamp) * 1000),
    txHash: mintLog.transactionHash,
    winningBid: null,
    winnerAddress: null,
  };
}

async function resolveEns(address: string): Promise<string | null> {
  try {
    const name = await client.getEnsName({ address: address as `0x${string}` });
    return name;
  } catch {
    return null;
  }
}
```

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-nouns",
      "schedule": "5 * * * *"
    }
  ]
}
```

Runs every hour at :05. The job is idempotent—it only syncs nouns we don't have.

### Initial Backfill

For first deployment, backfill all historical nouns:

```typescript
// /scripts/backfill-nouns.ts
// Run locally: npx tsx scripts/backfill-nouns.ts

async function backfill() {
  const currentAuction = await client.readContract({
    ...NOUNS_CONTRACTS.auctionHouse,
    functionName: 'auction',
  });
  
  const totalNouns = Number(currentAuction.nounId);
  console.log(`Backfilling ${totalNouns} nouns...`);
  
  // Process in batches to avoid rate limits
  const BATCH_SIZE = 10;
  for (let i = 0; i < totalNouns; i += BATCH_SIZE) {
    const batch = Array.from(
      { length: Math.min(BATCH_SIZE, totalNouns - i) },
      (_, j) => i + j
    );
    
    await Promise.all(batch.map(id => syncNoun(id)));
    console.log(`Synced nouns ${i} - ${i + batch.length - 1}`);
    
    // Rate limit
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('Backfill complete!');
}

backfill();
```

### Hook: Use Noun from Cache

```typescript
// /src/lib/nouns/hooks/useNoun.ts
import { useQuery } from '@tanstack/react-query';

interface CachedNoun {
  id: number;
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
  svg: string;
  settled_by_address: string;
  settled_by_ens: string | null;
  settled_at: string;
  winning_bid: string | null;
  winner_address: string | null;
  winner_ens: string | null;
}

export function useNoun(id: number) {
  return useQuery<CachedNoun>({
    queryKey: ['noun', id],
    queryFn: async () => {
      const response = await fetch(`/api/nouns/${id}`);
      if (!response.ok) throw new Error('Noun not found');
      return response.json();
    },
    staleTime: Infinity, // Nouns don't change
  });
}

export function useNouns(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['nouns', limit, offset],
    queryFn: async () => {
      const response = await fetch(`/api/nouns?limit=${limit}&offset=${offset}`);
      return response.json();
    },
  });
}
```

### Component: Cached Noun Image

```typescript
// Using cached SVG directly (no client-side rendering needed)
export function CachedNounImage({ id, size = 320 }: { id: number; size?: number }) {
  const { data: noun, isLoading } = useNoun(id);
  
  if (isLoading) {
    return <div style={{ width: size, height: size }} className="loading" />;
  }
  
  if (!noun) return null;
  
  return (
    <div
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: noun.svg }}
    />
  );
}
```

---

## Rendering Nouns

Berry OS renders Nouns client-side using bundled trait data. This is fast and doesn't require contract calls.

### File Structure

```
src/lib/nouns/
├── utils/
│   ├── image-data.ts       # Encoded trait images + palettes
│   ├── svg-builder.ts      # RLE decoder + SVG generator
│   └── trait-name-utils.ts # Human-readable trait names
```

### SVG Builder

Decodes RLE-encoded trait data and builds SVG:

```typescript
// /src/lib/nouns/utils/svg-builder.ts

interface DecodedImage {
  paletteIndex: number;
  bounds: { top: number; right: number; bottom: number; left: number };
  rects: [number, number][];
}

interface ImagePart {
  data: string;
}

/**
 * Given RLE parts, palette colors, and a background color, build an SVG image.
 */
export const buildSVG = (
  parts: ImagePart[], 
  paletteColors: string[], 
  bgColor: string
): string => {
  // Decodes RLE data and generates <rect> elements
  // Returns complete SVG string (320x320 viewBox)
};
```

### Trait Name Utils

Converts trait indices to human-readable names:

```typescript
// /src/lib/nouns/utils/trait-name-utils.ts
import { ImageData } from './image-data';

export type TraitType = 'background' | 'body' | 'accessory' | 'head' | 'glasses';

export function getTraitName(type: TraitType, value: number): string {
  // Returns formatted trait name like "Cool" or "Shark" or "3D Glasses"
}
```

### Rendering a Noun

```typescript
// /src/lib/nouns/render.ts
import { ImageData } from './utils/image-data';
import { buildSVG } from './utils/svg-builder';
import { getTraitName, TraitType } from './utils/trait-name-utils';

interface NounSeed {
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
}

/**
 * Render a Noun as an SVG string
 */
export function renderNounSVG(seed: NounSeed): string {
  const { background, body, accessory, head, glasses } = seed;
  
  // Get background color
  const bgColor = ImageData.bgcolors[background];
  
  // Get trait image data
  const parts = [
    { data: ImageData.images.bodies[body].data },
    { data: ImageData.images.accessories[accessory].data },
    { data: ImageData.images.heads[head].data },
    { data: ImageData.images.glasses[glasses].data },
  ];
  
  // Build SVG
  return buildSVG(parts, ImageData.palette, bgColor);
}

/**
 * Get trait names for a Noun
 */
export function getNounTraits(seed: NounSeed): Record<TraitType, string> {
  return {
    background: getTraitName('background', seed.background),
    body: getTraitName('body', seed.body),
    accessory: getTraitName('accessory', seed.accessory),
    head: getTraitName('head', seed.head),
    glasses: getTraitName('glasses', seed.glasses),
  };
}
```

### React Component

```typescript
// /src/lib/nouns/components/NounImage.tsx
import { useMemo } from 'react';
import { renderNounSVG } from '../render';

interface NounImageProps {
  seed: {
    background: number;
    body: number;
    accessory: number;
    head: number;
    glasses: number;
  };
  size?: number;
  className?: string;
}

export function NounImage({ seed, size = 320, className }: NounImageProps) {
  const svg = useMemo(() => renderNounSVG(seed), [
    seed.background,
    seed.body,
    seed.accessory,
    seed.head,
    seed.glasses,
  ]);
  
  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// Or as an image src
export function useNounDataUrl(seed: NounImageProps['seed']): string {
  return useMemo(() => {
    const svg = renderNounSVG(seed);
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }, [seed.background, seed.body, seed.accessory, seed.head, seed.glasses]);
}
```

### Usage in Apps

```typescript
// In Auction app
const Auction = () => {
  const { data: auction } = useCurrentAuction();
  
  if (!auction?.noun?.seed) return null;
  
  return (
    <div>
      <NounImage 
        seed={{
          background: Number(auction.noun.seed.background),
          body: Number(auction.noun.seed.body),
          accessory: Number(auction.noun.seed.accessory),
          head: Number(auction.noun.seed.head),
          glasses: Number(auction.noun.seed.glasses),
        }}
        size={256}
      />
      <p>Noun #{auction.noun.id}</p>
    </div>
  );
};
```

### Fallback Options

If client-side rendering fails or for thumbnails:

```typescript
// noun.pics CDN (pre-rendered PNGs)
const nounImageUrl = `https://noun.pics/${nounId}`;

// On-chain SVG (expensive, use sparingly)
const { data: svg } = useReadContract({
  ...NOUNS_CONTRACTS.descriptor,
  functionName: 'generateSVGImage',
  args: [seed],
});
```

---

## Error Handling

```typescript
// Common revert reasons
const NOUNS_ERRORS = {
  'Auction expired': 'This auction has ended',
  'Bid too low': 'Your bid must be higher than the current bid',
  'Not enough votes': 'You need more voting power to perform this action',
  'Already voted': 'You have already voted on this proposal',
  'Voting closed': 'Voting has ended for this proposal',
  'Not delegate': 'You must be a delegate to perform this action',
};

const handleNounsError = (error: Error) => {
  const message = error.message;
  
  for (const [key, value] of Object.entries(NOUNS_ERRORS)) {
    if (message.includes(key)) {
      return value;
    }
  }
  
  return 'Transaction failed. Please try again.';
};
```

---

## Testing

### Local Development

For local testing, consider:
- Mainnet fork with Anvil/Hardhat
- Tenderly fork for debugging
- Sepolia testnet (if Nouns has testnet deployment)

```typescript
// Environment-based contract config
const getContracts = () => {
  if (process.env.NEXT_PUBLIC_NETWORK === 'local') {
    return LOCAL_CONTRACTS; // Forked addresses
  }
  return NOUNS_CONTRACTS;
};
```

### Checklist

- [ ] Goldsky queries return expected data
- [ ] Current auction displays correctly
- [ ] Bid transaction succeeds
- [ ] Proposal list loads
- [ ] Vote transaction succeeds
- [ ] Delegation transaction succeeds
- [ ] Candidate creation works
- [ ] Feedback submission works
- [ ] Noun images render
- [ ] Error states display properly
- [ ] Client ID included in all transactions