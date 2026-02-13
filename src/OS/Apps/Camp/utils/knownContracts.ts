/**
 * Known NFT Platform Contracts
 * Maps contract addresses to human-readable platform names.
 * Used to provide contextual labels for Noun transfers involving smart contracts
 * (e.g., "withdrew from Arcade.xyz" or "deposited to BendDAO").
 */

interface ContractInfo {
  name: string;
  type: 'lending' | 'marketplace' | 'vault' | 'other';
}

const KNOWN_NFT_CONTRACTS: Record<string, ContractInfo> = {
  // --- NFT Lending Platforms ---

  // Arcade.xyz - Loan Core Proxy
  '0x81b2f8fc75bab64a6b144aa6d2faa127b4fa7fd9': { name: 'Arcade.xyz', type: 'lending' },

  // Gondi - Multi Source Loan (V3.1)
  '0xf41b389e0c1950dc0b16c9498eae77131cc08a56': { name: 'Gondi', type: 'lending' },
  // Gondi - Multi Source Loan (V3.0)
  '0xf65b99ce6dc5f6c556172bcc0ff27d3665a7d9a8': { name: 'Gondi', type: 'lending' },
  // Gondi - Multi Source Loan (V2)
  '0x478f6f994c6fb3cf3e444a489b3ad9edb8ccae16': { name: 'Gondi', type: 'lending' },

  // NFTfi - Direct Loan Fixed (V2)
  '0xf896527c49b44aab3cf22ae356fa3af8e331f280': { name: 'NFTfi', type: 'lending' },
  // NFTfi - Direct Loan Fixed (V2.1)
  '0x8252df1d8b29057d1afe3062bf5a64d503152bc8': { name: 'NFTfi', type: 'lending' },
  // NFTfi - Direct Loan Fixed (V2.3)
  '0xe52cec0e90115abeb3304baa36bc2655731f7934': { name: 'NFTfi', type: 'lending' },
  // NFTfi - Direct Loan Coordinator
  '0x2ae3e46290ade43593eabd15642ebd67157f5351': { name: 'NFTfi', type: 'lending' },

  // BendDAO - LendPool
  '0x085e34722e04567df9e6d2c32e82fd74f3342e79': { name: 'BendDAO', type: 'lending' },
  // BendDAO - LendPool Liquidator
  '0x154270a5ec350a9a9c127fed7787667a7b2ccba0': { name: 'BendDAO', type: 'lending' },

  // Blur Blend (Lending)
  '0x29469395eaf6f95920e59f858042f0e28d98a20b': { name: 'Blur Blend', type: 'lending' },

  // --- NFT Marketplaces ---

  // OpenSea Seaport 1.5
  '0x00000000000000adc04c56bf30ac9d3c0aaf14dc': { name: 'OpenSea', type: 'marketplace' },
  // OpenSea Seaport 1.6
  '0x0000000000000068f116a894984e2db1123eb395': { name: 'OpenSea', type: 'marketplace' },
  // Blur Marketplace
  '0x39da41747a83aee658334415666f3ef92dd0d541': { name: 'Blur', type: 'marketplace' },
  // Blur Marketplace V2
  '0xb2ecfe4e4d61f8790bbb9de2d1259b9e2410cea5': { name: 'Blur', type: 'marketplace' },

  // --- Vaults / Other ---

  // NFTX Vault Factory
  '0xbe86f647b167567525ccaafcd6f881f1ee558216': { name: 'NFTX', type: 'vault' },

  // Delegate.cash (V2)
  '0x00000000000000447e69651d841bd8d104bed493': { name: 'Delegate.cash', type: 'other' },
};

/**
 * Get the display label for a known contract address.
 * Returns the platform name if known, null otherwise.
 */
export function getContractLabel(address: string): string | null {
  const info = KNOWN_NFT_CONTRACTS[address.toLowerCase()];
  return info?.name ?? null;
}

/**
 * Get full contract info for a known address.
 */
export function getContractInfo(address: string): ContractInfo | null {
  return KNOWN_NFT_CONTRACTS[address.toLowerCase()] ?? null;
}

/**
 * Check if an address is in the known contracts list.
 */
export function isKnownContract(address: string): boolean {
  return address.toLowerCase() in KNOWN_NFT_CONTRACTS;
}
