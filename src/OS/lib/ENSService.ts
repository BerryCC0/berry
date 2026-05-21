/**
 * ENS Resolution Service
 *
 * OS-level ENS name resolution backed by the on-chain Universal Resolver
 * (via @ensdomains/ensjs + viem). Replaces the previous ensideas.com
 * dependency so we get:
 *   - ENSIP-10 wildcard resolution (required for DNS-imported names)
 *   - Verified reverse-resolution roundtrip (no spoofing via setName)
 *   - Multi-chain address records via CCIP-Read
 *
 * Public API (unchanged):
 *   - resolveName(address) → name | null
 *   - resolveAddress(name) → address | null
 *   - getAvatar(addressOrName) → url | null
 *   - formatAddress(address, name?) → string
 *   - clearCache()
 *
 * Respects the privacy.ensResolution setting.
 */

import { getAddressRecord, getName } from '@ensdomains/ensjs/public';
import { ensAvatarUrl } from '@/app/lib/ens/contracts';
import { ensPublicClient } from '@/app/lib/ens/client';
import { useSettingsStore } from "@/OS/store/settingsStore";
import { truncateAddress } from "@/shared/format";

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

interface ENSCache {
  addressToName: Map<string, CacheEntry<string | null>>;
  nameToAddress: Map<string, CacheEntry<string | null>>;
  addressToAvatar: Map<string, CacheEntry<string | null>>;
}

const CACHE_DURATION_MS = 5 * 60 * 1000;

class ENSServiceClass {
  private cache: ENSCache = {
    addressToName: new Map(),
    nameToAddress: new Map(),
    addressToAvatar: new Map(),
  };

  private pendingRequests: Map<string, Promise<string | null>> = new Map();

  private isEnabled(): boolean {
    try {
      return useSettingsStore.getState().settings.privacy.ensResolution;
    } catch {
      return true;
    }
  }

  private isCacheValid<T>(entry: CacheEntry<T> | undefined): boolean {
    if (!entry) return false;
    return Date.now() - entry.timestamp < CACHE_DURATION_MS;
  }

  private normalizeAddress(address: string): string {
    return address.toLowerCase();
  }

  private normalizeName(name: string): string {
    return name.toLowerCase();
  }

  async resolveAddress(name: string): Promise<string | null> {
    if (!this.isEnabled()) return null;
    if (!name || !name.includes(".")) return null;

    const key = this.normalizeName(name);
    const cached = this.cache.nameToAddress.get(key);
    if (this.isCacheValid(cached)) return cached!.value;

    const pendingKey = `name:${key}`;
    if (this.pendingRequests.has(pendingKey)) {
      return this.pendingRequests.get(pendingKey)!;
    }

    const promise = this.fetchAddress(key);
    this.pendingRequests.set(pendingKey, promise);

    try {
      const result = await promise;
      this.cache.nameToAddress.set(key, { value: result, timestamp: Date.now() });
      return result;
    } finally {
      this.pendingRequests.delete(pendingKey);
    }
  }

  async resolveName(address: string): Promise<string | null> {
    if (!this.isEnabled()) return null;
    if (!address || address.length !== 42) return null;

    const key = this.normalizeAddress(address);
    const cached = this.cache.addressToName.get(key);
    if (this.isCacheValid(cached)) return cached!.value;

    const pendingKey = `address:${key}`;
    if (this.pendingRequests.has(pendingKey)) {
      return this.pendingRequests.get(pendingKey)!;
    }

    const promise = this.fetchName(key);
    this.pendingRequests.set(pendingKey, promise);

    try {
      const result = await promise;
      this.cache.addressToName.set(key, { value: result, timestamp: Date.now() });
      return result;
    } finally {
      this.pendingRequests.delete(pendingKey);
    }
  }

  async getAvatar(addressOrName: string): Promise<string | null> {
    if (!this.isEnabled()) return null;

    const isAddress = addressOrName.startsWith("0x") && addressOrName.length === 42;
    const key = isAddress
      ? this.normalizeAddress(addressOrName)
      : this.normalizeName(addressOrName);

    const cached = this.cache.addressToAvatar.get(key);
    if (this.isCacheValid(cached)) return cached!.value;

    let name = addressOrName;
    if (isAddress) {
      const resolved = await this.resolveName(addressOrName);
      if (!resolved) {
        this.cache.addressToAvatar.set(key, { value: null, timestamp: Date.now() });
        return null;
      }
      name = resolved;
    }

    // ENS metadata service handles NFT-typed avatars (eip155:1/erc721:...) for us.
    try {
      const url = ensAvatarUrl(name);
      const res = await fetch(url, { method: "HEAD" });
      const value = res.ok ? url : null;
      this.cache.addressToAvatar.set(key, { value, timestamp: Date.now() });
      return value;
    } catch {
      this.cache.addressToAvatar.set(key, { value: null, timestamp: Date.now() });
      return null;
    }
  }

  formatAddress(address: string, ensName?: string | null): string {
    if (ensName) return ensName;
    if (!address || address.length !== 42) return address || "";
    return truncateAddress(address);
  }

  clearCache(): void {
    this.cache.addressToName.clear();
    this.cache.nameToAddress.clear();
    this.cache.addressToAvatar.clear();
    this.pendingRequests.clear();
  }

  // ==========================================================================
  // On-chain fetchers (Universal Resolver via @ensdomains/ensjs)
  // ==========================================================================

  private async fetchAddress(name: string): Promise<string | null> {
    try {
      const record = await getAddressRecord(ensPublicClient(), { name });
      return record?.value ?? null;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[ENS] resolveAddress failed for", name, error);
      }
      return null;
    }
  }

  private async fetchName(address: string): Promise<string | null> {
    try {
      // getName validates the forward-resolution roundtrip and only returns
      // a name when match: true. Without that check, anyone could set their
      // reverse record to claim to be vitalik.eth.
      const result = await getName(ensPublicClient(), {
        address: address as `0x${string}`,
      });
      if (!result || !result.match) return null;
      return result.name ?? null;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[ENS] resolveName failed for", address, error);
      }
      return null;
    }
  }
}

export const ensService = new ENSServiceClass();
