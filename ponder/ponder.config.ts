import { createConfig, rateLimit } from "ponder";
import { fallback, http } from "viem";

// RPC failover: try the configured PONDER_RPC_URL_1 first (typically Alchemy
// for fast initial sync), then transparently fall through to free public RPCs
// if that provider is paused, rate-limited, or otherwise unavailable. This
// keeps the indexer alive when a paid plan lapses or a key gets revoked.
function mainnetRpcTransport() {
  const transports = [];
  if (process.env.PONDER_RPC_URL_1) {
    transports.push(http(process.env.PONDER_RPC_URL_1));
  }
  transports.push(
    http("https://ethereum-rpc.publicnode.com"),
    http("https://eth.llamarpc.com"),
    http("https://rpc.ankr.com/eth"),
  );
  return fallback(transports, { retryCount: 1 });
}

import { NounsTokenABI } from "../app/lib/nouns/abis/NounsToken";
import { NounsAuctionHouseABI } from "../app/lib/nouns/abis/NounsAuctionHouse";
import { NounsDescriptorV3ABI } from "../app/lib/nouns/abis/NounsDescriptorV3";
import { NounsDAOLogicV3ABI } from "../app/lib/nouns/abis/NounsDAOLogicV3";
import { DataProxyABI } from "../app/lib/nouns/abis/DataProxy";
import { TreasuryTimelockABI } from "../app/lib/nouns/abis/TreasuryTimelock";
import { NounsTreasuryV1ABI } from "../app/lib/nouns/abis/NounsTreasuryV1";
import { ClientRewardsABI } from "../app/lib/nouns/abis/ClientRewards";
import { TokenBuyerABI } from "../app/lib/nouns/abis/TokenBuyer";
import { PayerABI } from "../app/lib/nouns/abis/Payer";
import { StreamFactoryABI } from "../app/lib/nouns/abis/StreamFactory";
import { NFTBackedTokenABI } from "../app/lib/nouns/abis/NFTBackedToken";
import { nounV2TokenAbi } from "../app/lib/nouns-v2/abis/nounV2Token";
import { nounV2AuctionHouseAbi } from "../app/lib/nouns-v2/abis/nounV2AuctionHouse";
import { nounV2TreasuryAbi } from "../app/lib/nouns-v2/abis/nounV2Treasury";
import { smallGrantsTreasuryAbi } from "../app/lib/nouns-v2/abis/smallGrantsTreasury";

export default createConfig({
  database: {
    kind: "postgres",
    connectionString: process.env.DATABASE_URL,
  },
  chains: {
    mainnet: {
      id: 1,
      rpc: rateLimit(mainnetRpcTransport(), {
        requestsPerSecond: 50,
        browser: false,
      }),
    },
  },
  contracts: {
    // =========================================================================
    // Subgraph 1: Core Protocol
    // =========================================================================

    NounsToken: {
      chain: "mainnet",
      abi: NounsTokenABI,
      address: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
      startBlock: 12985438,
    },

    NounsAuctionHouse: {
      chain: "mainnet",
      abi: NounsAuctionHouseABI,
      address: "0x830BD73E4184ceF73443C15111a1DF14e495C706",
      startBlock: 12985453,
    },

    NounsDescriptorV3: {
      chain: "mainnet",
      abi: NounsDescriptorV3ABI,
      address: "0x33a9c445fb4fb21f2c030a6b2d3e2f12d017bfac",
      startBlock: 20059934,
    },

    // =========================================================================
    // Subgraph 2: Governance
    // =========================================================================

    NounsDAO: {
      chain: "mainnet",
      abi: NounsDAOLogicV3ABI,
      address: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d",
      startBlock: 12985453,
    },

    NounsDAOData: {
      chain: "mainnet",
      abi: DataProxyABI,
      address: "0xf790A5f59678dd733fb3De93493A91f472ca1365",
      startBlock: 17812145,
    },

    // =========================================================================
    // Subgraph 3: Treasury & Finance
    // =========================================================================

    TreasuryV2: {
      chain: "mainnet",
      abi: TreasuryTimelockABI,
      address: "0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71",
      startBlock: 17811727,
    },

    TreasuryV1: {
      chain: "mainnet",
      abi: NounsTreasuryV1ABI,
      address: "0x0BC3807Ec262cB779b38D65b38158acC3bfedE10",
      startBlock: 12985452,
    },

    ClientRewards: {
      chain: "mainnet",
      abi: ClientRewardsABI,
      address: "0x883860178F95d0C82413eDc1D6De530cB4771d55",
      startBlock: 20650531,
    },

    TokenBuyer: {
      chain: "mainnet",
      abi: TokenBuyerABI,
      address: "0x4f2acdc74f6941390d9b1804fabc3e780388cfe5",
      startBlock: 15816284,
    },

    Payer: {
      chain: "mainnet",
      abi: PayerABI,
      address: "0xd97Bcd9f47cEe35c0a9ec1dc40C1269afc9E8E1D",
      startBlock: 15816284,
    },

    StreamFactory: {
      chain: "mainnet",
      abi: StreamFactoryABI,
      address: "0x0fd206FC7A7dBcD5661157eDCb1FFDD0D02A61ff",
      startBlock: 15816284,
    },

    // $nouns ERC-20 / NFT-backed token. Same contract holds the swap pool and
    // exposes deposit / redeem / swap. Lets the activity feed categorize what
    // would otherwise look like plain Noun transfers.
    TokenSwap: {
      chain: "mainnet",
      abi: NFTBackedTokenABI,
      address: "0x5c1760c98be951A4067DF234695c8014D8e7619C",
      startBlock: 20025445,
    },

    // =========================================================================
    // Subgraph 4: Nouns V2 + Small Grants
    // Independent fork of Nouns DAO. Same architecture, separate deployments.
    // =========================================================================

    NounV2Token: {
      chain: "mainnet",
      abi: nounV2TokenAbi,
      address: "0xb1d6bdf9326dd09183c2e9d25af5e22c637293b9",
      startBlock: 24951808,
    },

    NounV2AuctionHouse: {
      chain: "mainnet",
      abi: nounV2AuctionHouseAbi,
      address: "0x9a6ddb16e23967d5482e5bfd7444a04a5d5145fc",
      startBlock: 24951808,
    },

    NounV2Treasury: {
      chain: "mainnet",
      abi: nounV2TreasuryAbi,
      address: "0x2cdeb0d251674710840d9fa990d1de138dfe7c00",
      startBlock: 24951808,
    },

    SmallGrantsTreasury: {
      chain: "mainnet",
      abi: smallGrantsTreasuryAbi,
      address: "0xbac9233725440c595b19d975309cc98cb259253a",
      // Deployed shortly after V2; safe lower bound — Ponder skips empty blocks.
      startBlock: 24951808,
    },
  },
});
