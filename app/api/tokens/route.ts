/**
 * Token Balances API Route
 * Fetches ERC-20 token balances from Moralis
 * Only shows whitelisted trusted tokens
 */

import { NextRequest, NextResponse } from "next/server";

const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const MORALIS_BASE_URL = "https://deep-index.moralis.io/api/v2.2";

// Chain ID to Moralis chain name mapping
const CHAIN_MAP: Record<number, string> = {
  1: "eth",
  137: "polygon",
  8453: "base",
  10: "optimism",
  42161: "arbitrum",
  56: "bsc",
  43114: "avalanche",
};

// ============================================
// WHITELISTED TOKENS - Only these will display
// ============================================

// Ethereum Mainnet (chain ID 1)
const ETH_WHITELIST = new Set([
  // Liquid Staking Derivatives
  "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0".toLowerCase(), // wstETH
  "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84".toLowerCase(), // stETH
  "0xae78736Cd615f374D3085123A210448E74Fc6393".toLowerCase(), // rETH
  "0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa".toLowerCase(), // mETH
  "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704".toLowerCase(), // cbETH
  
  // Wrapped ETH
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toLowerCase(), // WETH
  
  // Stablecoins
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48".toLowerCase(), // USDC
  "0xdAC17F958D2ee523a2206206994597C13D831ec7".toLowerCase(), // USDT
  "0x6B175474E89094C44Da98b954EescdeCB5C8F770".toLowerCase(), // DAI
  "0x4Fabb145d64652a948d72533023f6E7A623C7C53".toLowerCase(), // BUSD
  "0x853d955aCEf822Db058eb8505911ED77F175b99e".toLowerCase(), // FRAX
  "0x8E870D67F660D95d5be530380D0eC0bd388289E1".toLowerCase(), // USDP (Pax Dollar)
  "0x0000000000085d4780B73119b644AE5ecd22b376".toLowerCase(), // TUSD
  
  // Major tokens
  "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599".toLowerCase(), // WBTC
  "0x514910771AF9Ca656af840dff83E8264EcF986CA".toLowerCase(), // LINK
  "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984".toLowerCase(), // UNI
  "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9".toLowerCase(), // AAVE
  "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2".toLowerCase(), // MKR
]);

// Polygon (chain ID 137)
const POLYGON_WHITELIST = new Set([
  "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270".toLowerCase(), // WMATIC
  "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619".toLowerCase(), // WETH
  "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174".toLowerCase(), // USDC
  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F".toLowerCase(), // USDT
  "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063".toLowerCase(), // DAI
]);

// Base (chain ID 8453)
const BASE_WHITELIST = new Set([
  "0x4200000000000000000000000000000000000006".toLowerCase(), // WETH
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".toLowerCase(), // USDC
  "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA".toLowerCase(), // USDbC
  "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb".toLowerCase(), // DAI
]);

// Optimism (chain ID 10)
const OPTIMISM_WHITELIST = new Set([
  "0x4200000000000000000000000000000000000006".toLowerCase(), // WETH
  "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85".toLowerCase(), // USDC
  "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58".toLowerCase(), // USDT
  "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1".toLowerCase(), // DAI
]);

// Arbitrum (chain ID 42161)
const ARBITRUM_WHITELIST = new Set([
  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1".toLowerCase(), // WETH
  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831".toLowerCase(), // USDC
  "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9".toLowerCase(), // USDT
  "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1".toLowerCase(), // DAI
  "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f".toLowerCase(), // WBTC
]);

// Get whitelist for chain
function getWhitelist(chain: string): Set<string> {
  switch (chain) {
    case "eth": return ETH_WHITELIST;
    case "polygon": return POLYGON_WHITELIST;
    case "base": return BASE_WHITELIST;
    case "optimism": return OPTIMISM_WHITELIST;
    case "arbitrum": return ARBITRUM_WHITELIST;
    default: return ETH_WHITELIST;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const chainId = searchParams.get("chainId");

  if (!address) {
    return NextResponse.json(
      { error: "Address is required" },
      { status: 400 }
    );
  }

  if (!MORALIS_API_KEY) {
    return NextResponse.json(
      { error: "Moralis API key not configured" },
      { status: 500 }
    );
  }

  const chain = CHAIN_MAP[Number(chainId)] || "eth";

  try {
    // Fetch native balance
    const nativeResponse = await fetch(
      `${MORALIS_BASE_URL}/${address}/balance?chain=${chain}`,
      {
        headers: {
          "X-API-Key": MORALIS_API_KEY,
          "Accept": "application/json",
        },
      }
    );

    // Fetch ERC-20 token balances
    const tokensResponse = await fetch(
      `${MORALIS_BASE_URL}/${address}/erc20?chain=${chain}`,
      {
        headers: {
          "X-API-Key": MORALIS_API_KEY,
          "Accept": "application/json",
        },
      }
    );

    if (!nativeResponse.ok || !tokensResponse.ok) {
      throw new Error("Failed to fetch balances from Moralis");
    }

    const nativeData = await nativeResponse.json();
    const tokensData = await tokensResponse.json();

    // Get native token symbol based on chain
    const nativeSymbols: Record<string, string> = {
      eth: "ETH",
      polygon: "MATIC",
      base: "ETH",
      optimism: "ETH",
      arbitrum: "ETH",
      bsc: "BNB",
      avalanche: "AVAX",
    };

    // Format native balance
    const nativeBalance = {
      symbol: nativeSymbols[chain] || "ETH",
      name: nativeSymbols[chain] || "Ethereum",
      balance: nativeData.balance || "0",
      decimals: 18,
      isNative: true,
      logo: null,
    };

    // Get whitelist for current chain
    const whitelist = getWhitelist(chain);

    // Only show whitelisted tokens with balance > 0
    const tokens = tokensData
      .filter((token: any) => {
        // Must be in whitelist
        const address = (token.token_address || "").toLowerCase();
        if (!whitelist.has(address)) return false;

        // Must have balance
        const balance = BigInt(token.balance || "0");
        return balance > BigInt(0);
      })
      .map((token: any) => ({
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        decimals: token.decimals,
        isNative: false,
        logo: token.logo || token.thumbnail,
        contractAddress: token.token_address,
      }))

    return NextResponse.json({
      native: nativeBalance,
      tokens,
      chain,
    });
  } catch (error) {
    console.error("[Tokens API] Error fetching balances:", error);
    return NextResponse.json(
      { error: "Failed to fetch token balances" },
      { status: 500 }
    );
  }
}

