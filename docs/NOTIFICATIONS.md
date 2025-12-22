# Berry OS - Notification System

> System-wide notifications for alerts, events, and user feedback.

## Overview

Berry OS includes a notification system inspired by classic Mac OS alerts combined with modern toast patterns. Notifications inform users of important events, transaction status, auction updates, and system messages.

---

## Notification Types

| Type | Icon | Use Case | Default Duration |
|------|------|----------|------------------|
| `info` | ℹ️ | General information, tips | 5s |
| `success` | ✓ | Completed actions, confirmations | 5s |
| `warning` | ⚠️ | Caution, requires attention | 8s |
| `error` | ✕ | Failed actions, errors | Persistent |
| `transaction` | ⟳ | Pending/confirmed transactions | Until resolved |
| `auction` | 🔨 | Auction events | 10s |
| `proposal` | 📋 | Governance updates | 10s |
| `system` | ⚙️ | System messages | 5s |

---

## Notification Schema

```typescript
// /src/types/notifications.ts

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  
  // Timing
  createdAt: number;
  duration: number | 'persistent'; // ms or never auto-dismiss
  expiresAt?: number;
  
  // Appearance
  icon?: string | React.ReactNode;
  image?: string; // e.g., Noun image
  
  // Interaction
  actions?: NotificationAction[];
  dismissible?: boolean; // default: true
  onClick?: () => void;
  
  // Grouping
  groupId?: string; // Group related notifications
  replaceId?: string; // Replace existing notification with same ID
  
  // State
  read: boolean;
  dismissed: boolean;
}

interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

type NotificationType = 
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'transaction'
  | 'auction'
  | 'proposal'
  | 'system';
```

---

## Notification Store

```typescript
// /src/stores/notificationStore.ts

import { create } from 'zustand';
import { nanoid } from 'nanoid';

interface NotificationStore {
  notifications: Notification[];
  
  // Add notifications
  notify: (notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'dismissed'>) => string;
  
  // Convenience methods
  info: (title: string, message?: string) => string;
  success: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  
  // Transaction notifications
  txPending: (hash: string, description: string) => string;
  txSuccess: (hash: string, description: string) => void;
  txError: (hash: string, description: string, error?: string) => void;
  
  // Actions
  dismiss: (id: string) => void;
  dismissAll: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  
  // Queries
  unreadCount: () => number;
  getByGroupId: (groupId: string) => Notification[];
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  
  notify: (notification) => {
    const id = nanoid();
    const now = Date.now();
    
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: now,
      duration: notification.duration ?? getDurationForType(notification.type),
      read: false,
      dismissed: false,
      dismissible: notification.dismissible ?? true,
    };
    
    // Handle replaceId - remove existing notification with same replaceId
    if (notification.replaceId) {
      set((state) => ({
        notifications: state.notifications.filter(
          (n) => n.replaceId !== notification.replaceId
        ),
      }));
    }
    
    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));
    
    // Auto-dismiss after duration (if not persistent)
    if (typeof newNotification.duration === 'number') {
      setTimeout(() => {
        get().dismiss(id);
      }, newNotification.duration);
    }
    
    return id;
  },
  
  // Convenience methods
  info: (title, message) => get().notify({ type: 'info', title, message }),
  success: (title, message) => get().notify({ type: 'success', title, message }),
  warning: (title, message) => get().notify({ type: 'warning', title, message }),
  error: (title, message) => get().notify({ type: 'error', title, message, duration: 'persistent' }),
  
  // Transaction notifications
  txPending: (hash, description) => {
    return get().notify({
      type: 'transaction',
      title: 'Transaction Pending',
      message: description,
      replaceId: `tx-${hash}`,
      duration: 'persistent',
      dismissible: false,
      actions: [
        {
          label: 'View on Etherscan',
          onClick: () => window.open(`https://etherscan.io/tx/${hash}`, '_blank'),
          variant: 'secondary',
        },
      ],
    });
  },
  
  txSuccess: (hash, description) => {
    get().notify({
      type: 'success',
      title: 'Transaction Confirmed',
      message: description,
      replaceId: `tx-${hash}`,
      duration: 8000,
      actions: [
        {
          label: 'View on Etherscan',
          onClick: () => window.open(`https://etherscan.io/tx/${hash}`, '_blank'),
          variant: 'secondary',
        },
      ],
    });
  },
  
  txError: (hash, description, error) => {
    get().notify({
      type: 'error',
      title: 'Transaction Failed',
      message: error || description,
      replaceId: `tx-${hash}`,
      duration: 'persistent',
    });
  },
  
  dismiss: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, dismissed: true } : n
      ),
    }));
    
    // Remove from array after animation
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 300);
  },
  
  dismissAll: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, dismissed: true })),
    }));
    
    setTimeout(() => {
      set({ notifications: [] });
    }, 300);
  },
  
  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },
  
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },
  
  unreadCount: () => {
    return get().notifications.filter((n) => !n.read && !n.dismissed).length;
  },
  
  getByGroupId: (groupId) => {
    return get().notifications.filter((n) => n.groupId === groupId);
  },
}));

// Helper to get default duration by type
function getDurationForType(type: NotificationType): number | 'persistent' {
  switch (type) {
    case 'error':
      return 'persistent';
    case 'warning':
      return 8000;
    case 'auction':
    case 'proposal':
      return 10000;
    default:
      return 5000;
  }
}
```

---

## Notification Components

### NotificationContainer

```typescript
// /src/OS/Notifications/NotificationContainer.tsx

import { useNotificationStore } from '@/stores/notificationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { NotificationToast } from './NotificationToast';
import styles from './NotificationContainer.module.css';

export const NotificationContainer = () => {
  const notifications = useNotificationStore((s) => s.notifications);
  const position = useSettingsStore((s) => s.settings.notifications.position);
  const enabled = useSettingsStore((s) => s.settings.notifications.enabled);
  
  if (!enabled) return null;
  
  const visibleNotifications = notifications
    .filter((n) => !n.dismissed)
    .slice(-5); // Show max 5 at a time
  
  return (
    <div className={`${styles.container} ${styles[position]}`}>
      {visibleNotifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
        />
      ))}
    </div>
  );
};
```

### NotificationToast

```typescript
// /src/OS/Notifications/NotificationToast.tsx

import { useNotificationStore } from '@/stores/notificationStore';
import styles from './NotificationToast.module.css';

interface NotificationToastProps {
  notification: Notification;
}

export const NotificationToast = ({ notification }: NotificationToastProps) => {
  const { dismiss, markAsRead } = useNotificationStore();
  
  const handleClick = () => {
    markAsRead(notification.id);
    notification.onClick?.();
  };
  
  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismiss(notification.id);
  };
  
  return (
    <div
      className={`${styles.toast} ${styles[notification.type]} ${notification.dismissed ? styles.dismissed : ''}`}
      onClick={handleClick}
      role="alert"
      aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className={styles.icon}>
        {getIconForType(notification.type, notification.icon)}
      </div>
      
      <div className={styles.content}>
        <div className={styles.title}>{notification.title}</div>
        {notification.message && (
          <div className={styles.message}>{notification.message}</div>
        )}
        
        {notification.actions && notification.actions.length > 0 && (
          <div className={styles.actions}>
            {notification.actions.map((action, i) => (
              <button
                key={i}
                className={`${styles.action} ${styles[action.variant || 'secondary']}`}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {notification.image && (
        <div className={styles.image}>
          <img src={notification.image} alt="" />
        </div>
      )}
      
      {notification.dismissible !== false && (
        <button
          className={styles.dismiss}
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      )}
    </div>
  );
};
```

### Notification Styles

```css
/* /src/OS/Notifications/NotificationContainer.module.css */

.container {
  position: fixed;
  z-index: var(--z-notifications);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  pointer-events: none;
  max-width: 400px;
  max-height: 100vh;
  overflow: hidden;
}

.container > * {
  pointer-events: auto;
}

/* Positions */
.top-right {
  top: calc(var(--menu-bar-height) + 8px);
  right: 0;
}

.top-left {
  top: calc(var(--menu-bar-height) + 8px);
  left: 0;
}

.bottom-right {
  bottom: calc(var(--dock-height) + 8px);
  right: 0;
  flex-direction: column-reverse;
}

.bottom-left {
  bottom: calc(var(--dock-height) + 8px);
  left: 0;
  flex-direction: column-reverse;
}
```

```css
/* /src/OS/Notifications/NotificationToast.module.css */

.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: var(--notification-bg);
  border: 1px solid var(--notification-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  animation: slideIn 0.3s ease-out;
  transition: transform 0.2s, opacity 0.2s;
}

.toast:hover {
  transform: translateX(-4px);
}

.dismissed {
  animation: slideOut 0.3s ease-in forwards;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* Type-specific styling */
.info { border-left: 4px solid var(--color-info); }
.success { border-left: 4px solid var(--color-success); }
.warning { border-left: 4px solid var(--color-warning); }
.error { border-left: 4px solid var(--color-error); }
.transaction { border-left: 4px solid var(--accent-color); }
.auction { border-left: 4px solid var(--nouns-yellow); }
.proposal { border-left: 4px solid var(--nouns-teal); }
.system { border-left: 4px solid var(--color-muted); }

.icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  flex: 1;
  min-width: 0;
}

.title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.message {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
  word-wrap: break-word;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.action {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}

.action.primary {
  background: var(--accent-color);
  color: white;
}

.action.secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.action.danger {
  background: var(--color-error);
  color: white;
}

.image {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 4px;
  overflow: hidden;
}

.image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dismiss {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.15s;
}

.dismiss:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* Transaction pending spinner */
.transaction .icon::after {
  content: '';
  width: 16px;
  height: 16px;
  border: 2px solid var(--accent-color);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## Notification Center

A menu bar item that shows notification history:

```typescript
// /src/OS/MenuBar/NotificationCenter.tsx

import { useState } from 'react';
import { useNotificationStore } from '@/stores/notificationStore';
import styles from './NotificationCenter.module.css';

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount());
  const { markAllAsRead, dismissAll } = useNotificationStore();
  
  const recentNotifications = notifications
    .filter((n) => !n.dismissed)
    .slice(-20)
    .reverse();
  
  return (
    <div className={styles.notificationCenter}>
      <button
        className={styles.trigger}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) markAllAsRead();
        }}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount}</span>
        )}
      </button>
      
      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>Notifications</h3>
            {recentNotifications.length > 0 && (
              <button onClick={dismissAll}>Clear All</button>
            )}
          </div>
          
          <div className={styles.list}>
            {recentNotifications.length === 0 ? (
              <div className={styles.empty}>No notifications</div>
            ) : (
              recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## Hook for Easy Usage

```typescript
// /src/hooks/useNotify.ts

import { useNotificationStore } from '@/stores/notificationStore';

export function useNotify() {
  const store = useNotificationStore();
  
  return {
    notify: store.notify,
    info: store.info,
    success: store.success,
    warning: store.warning,
    error: store.error,
    txPending: store.txPending,
    txSuccess: store.txSuccess,
    txError: store.txError,
    dismiss: store.dismiss,
  };
}

// Usage in components:
// const { success, error, txPending } = useNotify();
// success('Saved!', 'Your changes have been saved.');
```

---

## Auction Notifications

```typescript
// /src/lib/notifications/auctionNotifications.ts

import { useNotificationStore } from '@/stores/notificationStore';
import { useAuctionStore } from '@/stores/auctionStore';

export function setupAuctionNotifications() {
  const notify = useNotificationStore.getState().notify;
  
  // Subscribe to auction events
  useAuctionStore.subscribe((state, prevState) => {
    // New bid placed
    if (state.currentAuction?.amount !== prevState.currentAuction?.amount) {
      const auction = state.currentAuction;
      if (!auction) return;
      
      notify({
        type: 'auction',
        title: 'New Bid',
        message: `${formatEther(auction.amount)} ETH on Noun ${auction.nounId}`,
        image: `https://noun.pics/${auction.nounId}`,
        replaceId: `auction-bid-${auction.nounId}`,
        onClick: () => {
          // Open auction app
          eventBus.emit('app:open', { appId: 'auction' });
        },
      });
    }
    
    // Auction ending soon (5 min warning)
    const timeRemaining = Number(state.currentAuction?.endTime) * 1000 - Date.now();
    if (timeRemaining > 0 && timeRemaining <= 5 * 60 * 1000) {
      notify({
        type: 'auction',
        title: 'Auction Ending Soon',
        message: `Noun ${state.currentAuction?.nounId} auction ends in 5 minutes`,
        image: `https://noun.pics/${state.currentAuction?.nounId}`,
        replaceId: `auction-ending-${state.currentAuction?.nounId}`,
        actions: [
          {
            label: 'Place Bid',
            onClick: () => eventBus.emit('app:open', { appId: 'auction' }),
            variant: 'primary',
          },
        ],
      });
    }
    
    // Auction settled
    if (state.currentAuction?.settled && !prevState.currentAuction?.settled) {
      notify({
        type: 'auction',
        title: 'Auction Settled',
        message: `Noun ${prevState.currentAuction?.nounId} sold for ${formatEther(prevState.currentAuction?.amount || 0n)} ETH`,
        image: `https://noun.pics/${prevState.currentAuction?.nounId}`,
      });
    }
  });
}
```

---

## Proposal Notifications

```typescript
// /src/lib/notifications/proposalNotifications.ts

export function setupProposalNotifications() {
  const notify = useNotificationStore.getState().notify;
  
  // Poll for proposal state changes (or use WebSocket)
  // This is a simplified example
  
  function notifyProposalStateChange(
    proposalId: string,
    title: string,
    oldState: string,
    newState: string
  ) {
    const messages: Record<string, string> = {
      ACTIVE: 'Voting is now open',
      SUCCEEDED: 'Proposal passed! Awaiting queue.',
      DEFEATED: 'Proposal did not reach quorum',
      QUEUED: 'Proposal queued for execution',
      EXECUTED: 'Proposal has been executed',
      VETOED: 'Proposal was vetoed',
    };
    
    notify({
      type: 'proposal',
      title: `Proposal ${proposalId}`,
      message: messages[newState] || `Status: ${newState}`,
      replaceId: `proposal-${proposalId}`,
      onClick: () => {
        eventBus.emit('app:open', {
          appId: 'camp',
          params: { proposalId },
        });
      },
    });
  }
}
```

---

## Transaction Notifications with wagmi

```typescript
// /src/hooks/useTransactionNotifications.ts

import { useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useNotify } from './useNotify';

export function useTransactionWithNotification(
  hash: `0x${string}` | undefined,
  description: string
) {
  const { txPending, txSuccess, txError } = useNotify();
  
  const { isLoading, isSuccess, isError, error } = useWaitForTransactionReceipt({
    hash,
  });
  
  useEffect(() => {
    if (!hash) return;
    
    if (isLoading) {
      txPending(hash, description);
    } else if (isSuccess) {
      txSuccess(hash, description);
    } else if (isError) {
      txError(hash, description, error?.message);
    }
  }, [hash, isLoading, isSuccess, isError]);
  
  return { isLoading, isSuccess, isError };
}

// Usage:
// const { writeContract, data: hash } = useWriteContract();
// useTransactionWithNotification(hash, 'Placing bid on Noun 123');
```

---

## Sound Effects

```typescript
// /src/lib/notifications/sounds.ts

const SOUNDS = {
  notification: '/sounds/notification.mp3',
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  auction: '/sounds/auction.mp3',
} as const;

let audioContext: AudioContext | null = null;
const audioBuffers: Map<string, AudioBuffer> = new Map();

export async function initNotificationSounds() {
  if (typeof window === 'undefined') return;
  
  audioContext = new AudioContext();
  
  // Preload sounds
  for (const [key, url] of Object.entries(SOUNDS)) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      audioBuffers.set(key, audioBuffer);
    } catch (e) {
      console.warn(`Failed to load sound: ${key}`);
    }
  }
}

export function playNotificationSound(
  type: keyof typeof SOUNDS = 'notification'
) {
  const settings = useSettingsStore.getState().settings.notifications;
  if (!settings.soundEffects || !audioContext) return;
  
  const buffer = audioBuffers.get(type);
  if (!buffer) return;
  
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
}
```

---

## Mobile Considerations

On mobile, notifications appear differently:

```typescript
// /src/OS/Notifications/MobileNotifications.tsx

export const MobileNotificationContainer = () => {
  const notifications = useNotificationStore((s) => s.notifications);
  const platform = usePlatformStore((s) => s.platform);
  
  if (platform !== 'MOBILE') return null;
  
  // On mobile, notifications slide down from top
  // and are swipeable to dismiss
  return (
    <div className={styles.mobileContainer}>
      {notifications
        .filter((n) => !n.dismissed)
        .slice(-3)
        .map((notification) => (
          <SwipeableDismiss
            key={notification.id}
            onDismiss={() => dismiss(notification.id)}
          >
            <NotificationToast notification={notification} />
          </SwipeableDismiss>
        ))}
    </div>
  );
};
```

---

## Accessibility

```typescript
// Notifications use role="alert" and aria-live
// Error notifications use aria-live="assertive"
// Other notifications use aria-live="polite"

// Screen reader announces:
// "[Type] notification: [Title]. [Message]"

// Keyboard navigation:
// - Tab focuses notification actions
// - Escape dismisses focused notification
// - Notifications don't trap focus
```

---

## Settings Integration

Notification settings from [SYSTEM_SETTINGS.md](./SYSTEM_SETTINGS.md):

| Setting | Effect |
|---------|--------|
| Enable Notifications | Master toggle for all notifications |
| Position | Where notifications appear on screen |
| Duration | Override for auto-dismiss timing |
| Sound Effects | Play audio on notification |

```typescript
// Apply settings
function getEffectiveDuration(
  notification: Notification,
  settings: SystemSettings['notifications']
): number | 'persistent' {
  if (notification.duration === 'persistent') return 'persistent';
  if (settings.duration) return settings.duration;
  return notification.duration;
}
```

---

## Testing Checklist

- [ ] All notification types display correctly
- [ ] Notifications auto-dismiss after duration
- [ ] Persistent notifications require manual dismiss
- [ ] Transaction notifications update status correctly
- [ ] replaceId correctly replaces existing notifications
- [ ] Notification center shows history
- [ ] Unread badge count is accurate
- [ ] Position setting moves notifications correctly
- [ ] Sound effects play when enabled
- [ ] Notifications are keyboard accessible
- [ ] Screen readers announce notifications
- [ ] Mobile swipe-to-dismiss works
- [ ] Reduce motion disables animations
- [ ] Max 5 visible notifications at once