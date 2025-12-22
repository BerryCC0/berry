"use client";

/**
 * useENS Hook
 * React hook for ENS name resolution with automatic caching and loading states.
 * 
 * Usage:
 * const { name, avatar, isLoading } = useENS(address);
 * const { address: resolvedAddress } = useENS(ensName);
 */

import { useState, useEffect, useMemo } from "react";
import { ensService } from "@/OS/lib/ENSService";
import { useSettingsStore } from "@/OS/store/settingsStore";

interface UseENSResult {
  /** Resolved ENS name (if input was an address) */
  name: string | null;
  /** Resolved address (if input was an ENS name) */
  address: string | null;
  /** Avatar URL */
  avatar: string | null;
  /** Display-friendly format (ENS name or truncated address) */
  displayName: string;
  /** Whether resolution is in progress */
  isLoading: boolean;
  /** Whether ENS resolution is enabled in settings */
  isEnabled: boolean;
}

/**
 * Hook to resolve ENS names and addresses
 * @param addressOrName Ethereum address or ENS name
 * @returns Resolution result with name, address, avatar, and loading state
 */
export function useENS(addressOrName: string | undefined | null): UseENSResult {
  const [name, setName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isEnabled = useSettingsStore((state) => state.settings.privacy.ensResolution);

  // Determine if input is an address or name
  const isAddress = useMemo(() => {
    if (!addressOrName) return false;
    return addressOrName.startsWith("0x") && addressOrName.length === 42;
  }, [addressOrName]);

  // Resolve on mount and when input changes
  useEffect(() => {
    if (!addressOrName || !isEnabled) {
      setName(null);
      setAddress(null);
      setAvatar(null);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    const resolve = async () => {
      try {
        if (isAddress) {
          // Input is an address - resolve to name and get avatar
          const [resolvedName, resolvedAvatar] = await Promise.all([
            ensService.resolveName(addressOrName),
            ensService.getAvatar(addressOrName),
          ]);

          if (!isCancelled) {
            setName(resolvedName);
            setAddress(addressOrName);
            setAvatar(resolvedAvatar);
          }
        } else {
          // Input is an ENS name - resolve to address and get avatar
          const [resolvedAddress, resolvedAvatar] = await Promise.all([
            ensService.resolveAddress(addressOrName),
            ensService.getAvatar(addressOrName),
          ]);

          if (!isCancelled) {
            setName(addressOrName);
            setAddress(resolvedAddress);
            setAvatar(resolvedAvatar);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[useENS] Resolution failed:", error);
        }
        if (!isCancelled) {
          setName(null);
          setAddress(isAddress ? addressOrName : null);
          setAvatar(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    resolve();

    return () => {
      isCancelled = true;
    };
  }, [addressOrName, isAddress, isEnabled]);

  // Compute display name
  const displayName = useMemo(() => {
    if (!addressOrName) return "";

    // If ENS resolution is disabled, just format the address
    if (!isEnabled) {
      return isAddress
        ? ensService.formatAddress(addressOrName)
        : addressOrName;
    }

    // If we have a resolved name, use it
    if (name) {
      return name;
    }

    // Otherwise format the address
    return isAddress
      ? ensService.formatAddress(addressOrName)
      : addressOrName;
  }, [addressOrName, name, isAddress, isEnabled]);

  return {
    name,
    address,
    avatar,
    displayName,
    isLoading,
    isEnabled,
  };
}

/**
 * Hook to batch resolve multiple addresses
 * Useful for lists of addresses
 */
export function useENSBatch(
  addresses: (string | undefined | null)[]
): Map<string, UseENSResult> {
  const [results, setResults] = useState<Map<string, UseENSResult>>(new Map());
  const isEnabled = useSettingsStore((state) => state.settings.privacy.ensResolution);

  // Filter to valid addresses
  const validAddresses = useMemo(() => {
    return addresses.filter(
      (a): a is string => !!a && a.startsWith("0x") && a.length === 42
    );
  }, [addresses]);

  useEffect(() => {
    if (!isEnabled || validAddresses.length === 0) {
      setResults(new Map());
      return;
    }

    let isCancelled = false;

    const resolveAll = async () => {
      const newResults = new Map<string, UseENSResult>();

      // Initialize with loading state
      for (const addr of validAddresses) {
        newResults.set(addr, {
          name: null,
          address: addr,
          avatar: null,
          displayName: ensService.formatAddress(addr),
          isLoading: true,
          isEnabled,
        });
      }
      setResults(new Map(newResults));

      // Resolve each address
      await Promise.all(
        validAddresses.map(async (addr) => {
          const [name, avatar] = await Promise.all([
            ensService.resolveName(addr),
            ensService.getAvatar(addr),
          ]);

          if (!isCancelled) {
            newResults.set(addr, {
              name,
              address: addr,
              avatar,
              displayName: name || ensService.formatAddress(addr),
              isLoading: false,
              isEnabled,
            });
            setResults(new Map(newResults));
          }
        })
      );
    };

    resolveAll();

    return () => {
      isCancelled = true;
    };
  }, [validAddresses.join(","), isEnabled]);

  return results;
}

