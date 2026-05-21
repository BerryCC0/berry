"use client";

/**
 * IdentityHeader — the row shared by both Wallet and Names surfaces.
 *
 * Left: AddressChip (avatar + ENS + truncated address + chain subtitle).
 * Right: SurfaceToggle for swapping to the other surface.
 *
 * Renders consistently across the surface swap so the header content
 * doesn't visibly change — only the body crossfades.
 *
 * Disconnected state shows a Connect button in place of the chip so
 * the toggle remains reachable.
 */

import { useWallet } from "@/OS/hooks/useWallet";
import { useENS } from "@/OS/hooks/useENS";
import { SurfaceToggle } from "../SurfaceToggle";
import { AddressChip } from "./AddressChip";
import styles from "./IdentityHeader.module.css";

const SURFACE_TO_TARGET: Record<"wallet" | "names", { appId: string; label: string }> = {
  wallet: { appId: "names", label: "Names" },
  names: { appId: "wallet-panel", label: "Wallet" },
};

const CHAIN_DISPLAY: Record<string, string> = {
  ethereum: "Ethereum",
  base: "Base",
  optimism: "Optimism",
  arbitrum: "Arbitrum",
  polygon: "Polygon",
  solana: "Solana",
  bitcoin: "Bitcoin",
};

function chainLabel(chainName: string | undefined): string | undefined {
  if (!chainName || chainName === "unknown") return undefined;
  return CHAIN_DISPLAY[chainName] ?? chainName;
}

interface IdentityHeaderProps {
  windowId: string;
  surface: "wallet" | "names";
}

export function IdentityHeader({ windowId, surface }: IdentityHeaderProps) {
  const { isConnected, address, chainName, connect } = useWallet();
  const { name: ensName, avatar } = useENS(address);

  const target = SURFACE_TO_TARGET[surface];
  const arrow = surface === "wallet" ? "→" : "←";
  const toggleLabel = surface === "wallet" ? `${target.label} ${arrow}` : `${arrow} ${target.label}`;

  return (
    <div className={styles.header}>
      <div className={styles.left}>
        {isConnected && address ? (
          <AddressChip
            address={address}
            ensName={ensName}
            avatarSrc={avatar}
            subtitle={chainLabel(chainName)}
            copyable
            avatarSize={36}
          />
        ) : (
          <button type="button" className={styles.connectButton} onClick={connect}>
            Connect wallet
          </button>
        )}
      </div>
      <SurfaceToggle windowId={windowId} toAppId={target.appId} label={toggleLabel} />
    </div>
  );
}
