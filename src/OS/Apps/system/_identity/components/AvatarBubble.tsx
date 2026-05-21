"use client";

/**
 * AvatarBubble — ENS avatar with gradient fallback.
 *
 * Used everywhere we surface an address with optional ENS identity.
 * The fallback shows the first two non-prefix chars of the address
 * (e.g. "22" for 0x225f…) over a Berry-accent gradient, matching the
 * existing WalletInfo avatar treatment.
 */

import styles from "./AvatarBubble.module.css";

interface AvatarBubbleProps {
  /** Ethereum address. Always required; powers the gradient + fallback. */
  address: string;
  /** Resolved ENS avatar URL (or null/undefined for fallback). */
  src?: string | null;
  /** Pixel size. Defaults to 40. Common values: 24, 32, 40, 48, 64. */
  size?: number;
  /** Optional CSS class overrides for callers that need positioning tweaks. */
  className?: string;
}

export function AvatarBubble({ address, src, size = 40, className }: AvatarBubbleProps) {
  const initials = address.startsWith("0x") && address.length >= 4
    ? address.slice(2, 4).toUpperCase()
    : "??";

  return (
    <div
      className={`${styles.bubble}${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className={styles.image} />
      ) : (
        <span className={styles.fallback} style={{ fontSize: Math.max(10, size * 0.34) }}>
          {initials}
        </span>
      )}
    </div>
  );
}
