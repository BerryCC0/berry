/**
 * ENS Resolution Service
 * Provides OS-level ENS name resolution with caching.
 * 
 * Usage:
 * - Direct: ensService.resolveName(address) / ensService.resolveAddress(name)
 * - React: useENS(addressOrName) hook
 * 
 * Respects the privacy.ensResolution setting.
 */

import { useSettingsStore } from "@/OS/store/settingsStore";

// Cache types
interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

interface ENSCache {
  // address -> name
  addressToName: Map<string, CacheEntry<string | null>>;
  // name -> address
  nameToAddress: Map<string, CacheEntry<string | null>>;
  // address -> avatar URL
  addressToAvatar: Map<string, CacheEntry<string | null>>;
}

// Cache configuration
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAINNET_RPC = "https://eth.llamarpc.com"; // Free public RPC

class ENSServiceClass {
  private cache: ENSCache = {
    addressToName: new Map(),
    nameToAddress: new Map(),
    addressToAvatar: new Map(),
  };

  private pendingRequests: Map<string, Promise<string | null>> = new Map();

  /**
   * Check if ENS resolution is enabled in settings
   */
  private isEnabled(): boolean {
    try {
      return useSettingsStore.getState().settings.privacy.ensResolution;
    } catch {
      return true; // Default to enabled if store not ready
    }
  }

  /**
   * Check if a cache entry is still valid
   */
  private isCacheValid<T>(entry: CacheEntry<T> | undefined): boolean {
    if (!entry) return false;
    return Date.now() - entry.timestamp < CACHE_DURATION_MS;
  }

  /**
   * Normalize an Ethereum address to lowercase
   */
  private normalizeAddress(address: string): string {
    return address.toLowerCase();
  }

  /**
   * Normalize an ENS name to lowercase
   */
  private normalizeName(name: string): string {
    return name.toLowerCase();
  }

  /**
   * Make an ETH JSON-RPC call
   */
  private async rpcCall(method: string, params: unknown[]): Promise<unknown> {
    const response = await fetch(MAINNET_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || "RPC error");
    }
    return data.result;
  }

  /**
   * Resolve an ENS name to an address
   * @param name ENS name (e.g., "vitalik.eth")
   * @returns Ethereum address or null if not found
   */
  async resolveAddress(name: string): Promise<string | null> {
    if (!this.isEnabled()) return null;
    if (!name || !name.includes(".")) return null;

    const normalizedName = this.normalizeName(name);

    // Check cache
    const cached = this.cache.nameToAddress.get(normalizedName);
    if (this.isCacheValid(cached)) {
      return cached!.value;
    }

    // Check for pending request
    const pendingKey = `name:${normalizedName}`;
    if (this.pendingRequests.has(pendingKey)) {
      return this.pendingRequests.get(pendingKey)!;
    }

    // Make the request
    const promise = this.fetchAddress(normalizedName);
    this.pendingRequests.set(pendingKey, promise);

    try {
      const result = await promise;
      this.cache.nameToAddress.set(normalizedName, {
        value: result,
        timestamp: Date.now(),
      });
      return result;
    } finally {
      this.pendingRequests.delete(pendingKey);
    }
  }

  /**
   * Resolve an address to an ENS name (reverse lookup)
   * @param address Ethereum address
   * @returns ENS name or null if not found
   */
  async resolveName(address: string): Promise<string | null> {
    if (!this.isEnabled()) return null;
    if (!address || address.length !== 42) return null;

    const normalizedAddress = this.normalizeAddress(address);

    // Check cache
    const cached = this.cache.addressToName.get(normalizedAddress);
    if (this.isCacheValid(cached)) {
      return cached!.value;
    }

    // Check for pending request
    const pendingKey = `address:${normalizedAddress}`;
    if (this.pendingRequests.has(pendingKey)) {
      return this.pendingRequests.get(pendingKey)!;
    }

    // Make the request
    const promise = this.fetchName(normalizedAddress);
    this.pendingRequests.set(pendingKey, promise);

    try {
      const result = await promise;
      this.cache.addressToName.set(normalizedAddress, {
        value: result,
        timestamp: Date.now(),
      });
      return result;
    } finally {
      this.pendingRequests.delete(pendingKey);
    }
  }

  /**
   * Get avatar for an address or ENS name
   * @param addressOrName Ethereum address or ENS name
   * @returns Avatar URL or null
   */
  async getAvatar(addressOrName: string): Promise<string | null> {
    if (!this.isEnabled()) return null;

    // Determine if it's an address or name
    const isAddress = addressOrName.startsWith("0x") && addressOrName.length === 42;
    const normalizedKey = isAddress
      ? this.normalizeAddress(addressOrName)
      : this.normalizeName(addressOrName);

    // Check cache
    const cached = this.cache.addressToAvatar.get(normalizedKey);
    if (this.isCacheValid(cached)) {
      return cached!.value;
    }

    // For addresses, first resolve to name
    let ensName = addressOrName;
    if (isAddress) {
      const name = await this.resolveName(addressOrName);
      if (!name) {
        this.cache.addressToAvatar.set(normalizedKey, {
          value: null,
          timestamp: Date.now(),
        });
        return null;
      }
      ensName = name;
    }

    // Fetch avatar from ENS metadata service
    try {
      const avatarUrl = `https://metadata.ens.domains/mainnet/avatar/${ensName}`;
      const response = await fetch(avatarUrl, { method: "HEAD" });
      
      if (response.ok) {
        this.cache.addressToAvatar.set(normalizedKey, {
          value: avatarUrl,
          timestamp: Date.now(),
        });
        return avatarUrl;
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[ENS] Failed to fetch avatar:", error);
      }
    }

    this.cache.addressToAvatar.set(normalizedKey, {
      value: null,
      timestamp: Date.now(),
    });
    return null;
  }

  /**
   * Format an address for display - shows ENS name if available, otherwise truncated address
   * @param address Ethereum address
   * @param ensName Optional pre-resolved ENS name
   * @returns Formatted string
   */
  formatAddress(address: string, ensName?: string | null): string {
    if (ensName) {
      return ensName;
    }
    if (!address || address.length !== 42) {
      return address || "";
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Clear the cache (useful for testing or when settings change)
   */
  clearCache(): void {
    this.cache.addressToName.clear();
    this.cache.nameToAddress.clear();
    this.cache.addressToAvatar.clear();
    this.pendingRequests.clear();
  }

  // ============================================================================
  // Private fetch methods using ENS Universal Resolver
  // ============================================================================

  private async fetchAddress(name: string): Promise<string | null> {
    try {
      // Use ENS public resolver approach via eth_call
      // This is a simplified approach using the ENS metadata API
      const response = await fetch(
        `https://api.ensideas.com/ens/resolve/${encodeURIComponent(name)}`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.address || null;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[ENS] Failed to resolve address for", name, error);
      }
      return null;
    }
  }

  private async fetchName(address: string): Promise<string | null> {
    try {
      // Use ENS ideas API for reverse lookup
      const response = await fetch(
        `https://api.ensideas.com/ens/resolve/${encodeURIComponent(address)}`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.name || null;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[ENS] Failed to resolve name for", address, error);
      }
      return null;
    }
  }
}

// Export singleton instance
export const ensService = new ENSServiceClass();

