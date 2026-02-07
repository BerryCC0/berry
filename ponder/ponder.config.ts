import { createConfig, rateLimit } from "ponder";
import { http } from "viem";

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

export default createConfig({
  database: {
    kind: "postgres",
    connectionString: process.env.DATABASE_URL,
  },
  chains: {
    mainnet: {
      id: 1,
      rpc: rateLimit(http(process.env.PONDER_RPC_URL_1), {
        requestsPerSecond: 10,
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
      startBlock: 17990266,
    },

    NounsDAOData: {
      chain: "mainnet",
      abi: DataProxyABI,
      address: "0xf790A5f59678dd733fb3De93493A91f472ca1365",
      startBlock: 17990266,
    },

    // =========================================================================
    // Subgraph 3: Treasury & Finance
    // =========================================================================

    TreasuryV2: {
      chain: "mainnet",
      abi: TreasuryTimelockABI,
      address: "0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71",
      startBlock: 17990266,
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
  },
});
