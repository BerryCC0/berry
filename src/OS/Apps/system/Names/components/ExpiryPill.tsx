"use client";

/**
 * ExpiryPill — colored "expires Mar 2027" indicator.
 *
 * Color thresholds:
 *   > 90 days       muted text, no background
 *   30–90 days      amber (warning)
 *   < 30 days       red (error)
 *   expired         red with "expired" label
 *
 * Used in NameListItem and NameDetail.
 */

import styles from "./ExpiryPill.module.css";

interface ExpiryPillProps {
  /** Unix seconds — either bigint, number, or numeric string. */
  expiry: bigint | number | string | null | undefined;
}

function toMs(expiry: bigint | number | string): number {
  if (typeof expiry === "bigint") return Number(expiry) * 1000;
  if (typeof expiry === "string") return Number(expiry) * 1000;
  return expiry * 1000;
}

function formatMonthYear(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function ExpiryPill({ expiry }: ExpiryPillProps) {
  if (expiry === null || expiry === undefined) return null;

  const expiryMs = toMs(expiry);
  // eslint-disable-next-line react-hooks/purity
  const diffDays = (expiryMs - Date.now()) / (1000 * 60 * 60 * 24);

  let tone: "muted" | "warn" | "danger";
  let label: string;

  if (diffDays < 0) {
    tone = "danger";
    label = `expired ${formatMonthYear(expiryMs)}`;
  } else if (diffDays < 30) {
    tone = "danger";
    label = `expires ${formatMonthYear(expiryMs)}`;
  } else if (diffDays < 90) {
    tone = "warn";
    label = `expires ${formatMonthYear(expiryMs)}`;
  } else {
    tone = "muted";
    label = `expires ${formatMonthYear(expiryMs)}`;
  }

  return <span className={`${styles.pill} ${styles[tone]}`}>{label}</span>;
}
