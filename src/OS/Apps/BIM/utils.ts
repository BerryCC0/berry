/**
 * BIM Utility Functions
 */

/**
 * Truncate an Ethereum address for display
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format a unix timestamp (ms) to a time string
 */
export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (isToday) return `Today at ${time}`;
  if (isYesterday) return `Yesterday at ${time}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${time}`;
}

/**
 * Format a date separator (e.g., "January 5, 2026")
 */
export function formatDateSeparator(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Check if two messages should be grouped (same sender within 5 min)
 */
export function shouldGroupMessages(
  prevTimestamp: number,
  prevSender: string,
  currentTimestamp: number,
  currentSender: string
): boolean {
  if (prevSender !== currentSender) return false;
  return currentTimestamp - prevTimestamp < 5 * 60 * 1000;
}

/**
 * Check if a date separator should be shown between two messages
 */
export function shouldShowDateSeparator(prevTimestamp: number, currentTimestamp: number): boolean {
  const prevDate = new Date(prevTimestamp).toDateString();
  const currentDate = new Date(currentTimestamp).toDateString();
  return prevDate !== currentDate;
}

/**
 * Generate a color from a wallet address (for avatar backgrounds)
 */
export function addressToColor(address: string): string {
  const colors = [
    "#5865F2", "#57F287", "#FEE75C", "#EB459E", "#ED4245",
    "#3BA55C", "#FAA61A", "#5865F2", "#E67E22", "#9B59B6",
    "#1ABC9C", "#E91E63", "#2196F3", "#FF5722", "#607D8B",
  ];
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Get initials from a display name or address
 */
export function getInitials(name: string | null, address: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return address.slice(2, 4).toUpperCase();
}

/**
 * Get display name for a member
 */
export function getMemberDisplayName(
  address: string,
  nickname?: string | null,
  displayName?: string | null
): string {
  if (nickname) return nickname;
  if (displayName) return displayName;
  return truncateAddress(address);
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Role hierarchy for permissions
 */
const ROLE_HIERARCHY: Record<string, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

export function hasPermission(userRole: string, requiredRole: string): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}
