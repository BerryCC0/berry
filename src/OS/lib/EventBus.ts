/**
 * Event Bus System
 * Three-tier event bus architecture for loose coupling
 *
 * - SystemBus: OS ↔ OS communication only
 * - AppBus: App ↔ App communication
 * - BridgeBus: OS → App communication (read-only for apps)
 */

import type { SystemEvents, AppEvents, BridgeEvents } from "@/OS/types/events";

type EventHandler<T> = (data: T) => void;

/**
 * Typed Event Bus implementation
 */
/** Max consecutive errors before a handler is auto-unsubscribed. */
const MAX_HANDLER_ERRORS = 3;

class TypedEventBus<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<EventHandler<unknown>>>();
  /** Tracks consecutive error count per handler to auto-remove broken listeners. */
  private errorCounts = new WeakMap<EventHandler<unknown>, number>();
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Emit an event with data
   */
  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    if (process.env.NODE_ENV === "development") {
      console.log(`[${this.name}] ${String(event)}`, data);
    }

    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) return;

    const toRemove: EventHandler<unknown>[] = [];

    eventHandlers.forEach((handler) => {
      try {
        handler(data);
        // Reset error count on success
        this.errorCounts.delete(handler);
      } catch (error) {
        const count = (this.errorCounts.get(handler) ?? 0) + 1;
        this.errorCounts.set(handler, count);

        console.error(
          `[${this.name}] Error in handler for ${String(event)} (${count}/${MAX_HANDLER_ERRORS}):`,
          error
        );

        if (count >= MAX_HANDLER_ERRORS) {
          toRemove.push(handler);
        }
      }
    });

    // Auto-unsubscribe repeatedly failing handlers
    for (const handler of toRemove) {
      eventHandlers.delete(handler);
      this.errorCounts.delete(handler);
      console.warn(
        `[${this.name}] Auto-removed handler for ${String(event)} after ${MAX_HANDLER_ERRORS} consecutive errors`
      );
    }
  }

  /**
   * Subscribe to an event
   */
  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler as EventHandler<unknown>);
    }
  }

  /**
   * Subscribe to an event once
   */
  once<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    const onceHandler: EventHandler<Events[K]> = (data) => {
      this.off(event, onceHandler);
      handler(data);
    };
    this.on(event, onceHandler);
  }

  /**
   * Remove all handlers for an event (or all events)
   */
  clear(event?: keyof Events): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Check if event has handlers
   */
  hasListeners(event: keyof Events): boolean {
    const handlers = this.handlers.get(event);
    return handlers !== undefined && handlers.size > 0;
  }
}

/**
 * System Bus - OS components only
 * Used for internal OS communication
 */
export const systemBus = new TypedEventBus<SystemEvents>("SystemBus");

/**
 * App Bus - Communication between apps
 * Used for app-to-app messaging
 */
export const appBus = new TypedEventBus<AppEvents>("AppBus");

/**
 * Bridge Bus - OS → App communication (read-only for apps)
 * Apps can subscribe, only OS can emit
 */
export const bridgeBus = new TypedEventBus<BridgeEvents>("BridgeBus");

/**
 * Set up bridge forwarding from system events to bridge events
 * This should be called once during OS initialization
 */
export function initializeBridgeForwarding(): void {
  // Forward theme changes
  systemBus.on("theme:changed", (data) => {
    bridgeBus.emit("bridge:theme-changed", data);
  });

  // Forward window focus events
  systemBus.on("window:focused", (data) => {
    // Get the appId from the window store if needed
    bridgeBus.emit("bridge:window-focused", {
      windowId: data.windowId,
      appId: "", // Will be populated by window store integration
    });
  });

  // Forward wallet changes
  systemBus.on("session:wallet-connected", (data) => {
    bridgeBus.emit("bridge:wallet-changed", {
      address: data.address,
      chain: data.chain,
      chainId: data.chainId,
    });
  });

  systemBus.on("session:wallet-disconnected", () => {
    bridgeBus.emit("bridge:wallet-changed", {
      address: null,
      chain: null,
      chainId: null,
    });
  });
}

/**
 * For React hooks to subscribe to events, use:
 * import { useSystemEvent, useAppEvent, useBridgeEvent } from "@/OS/lib/useEventBus";
 */

