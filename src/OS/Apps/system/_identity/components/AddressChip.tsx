"use client";

/**
 * AddressChip — avatar + identity stack for an Ethereum address.
 *
 * Renders the ENS name (if available) over the truncated address with
 * an optional copy button. Used in IdentityHeader and reusable for any
 * "this is whose wallet we're looking at" surface.
 */

import { useState } from "react";
import { AvatarBubble } from "./AvatarBubble";
import styles from "./AddressChip.module.css";

interface AddressChipProps {
  address: string;
  ensName?: string | null;
  avatarSrc?: string | null;
  /** Subtitle text shown below the name (e.g. chain name). */
  subtitle?: string;
  /** Show the copy-to-clipboard button. */
  copyable?: boolean;
  /** Pixel size of the avatar. Defaults to 40. */
  avatarSize?: number;
  className?: string;
}

function truncate(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function AddressChip({
  address,
  ensName,
  avatarSrc,
  subtitle,
  copyable = false,
  avatarSize = 40,
  className,
}: AddressChipProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const truncated = truncate(address);

  return (
    <div className={`${styles.chip}${className ? ` ${className}` : ""}`}>
      <AvatarBubble address={address} src={avatarSrc} size={avatarSize} />
      <div className={styles.identity}>
        <div className={styles.primary}>
          {ensName ? (
            <>
              <span className={styles.name} title={ensName}>{ensName}</span>
            </>
          ) : (
            <span className={styles.address} title={address}>{truncated}</span>
          )}
        </div>
        <div className={styles.secondary}>
          {ensName && <span className={styles.address}>{truncated}</span>}
          {copyable && (
            <button
              type="button"
              className={styles.copyButton}
              onClick={handleCopy}
              title={copied ? "Copied" : "Copy address"}
              aria-label={copied ? "Copied" : "Copy address"}
            >
              {copied ? "✓" : "⎘"}
            </button>
          )}
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}
