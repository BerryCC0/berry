/**
 * React hooks for Event Bus
 * Provides auto-cleanup event subscriptions for components
 */

import { useEffect, useRef, useCallback } from "react";
import { systemBus, appBus, bridgeBus } from "./EventBus";
import type { SystemEvents, AppEvents, BridgeEvents } from "@/OS/types/events";

type EventHandler<T> = (data: T) => void;

/**
 * Hook for subscribing to System Bus events with auto-cleanup
 * Only use in OS components
 */
export function useSystemEvent<K extends keyof SystemEvents>(
  event: K,
  handler: EventHandler<SystemEvents[K]>,
  deps: React.DependencyList = []
): void {
  const handlerRef = useRef(handler);
  
  // Update ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const stableHandler: EventHandler<SystemEvents[K]> = (data) => {
      handlerRef.current(data);
    };
    
    systemBus.on(event, stableHandler);
    
    return () => {
      systemBus.off(event, stableHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

/**
 * Hook for subscribing to App Bus events with auto-cleanup
 * Use in app components for inter-app communication
 */
export function useAppEvent<K extends keyof AppEvents>(
  event: K,
  handler: EventHandler<AppEvents[K]>,
  deps: React.DependencyList = []
): void {
  const handlerRef = useRef(handler);
  
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const stableHandler: EventHandler<AppEvents[K]> = (data) => {
      handlerRef.current(data);
    };
    
    appBus.on(event, stableHandler);
    
    return () => {
      appBus.off(event, stableHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

/**
 * Hook for subscribing to Bridge Bus events with auto-cleanup
 * Use in apps to listen to OS events (read-only)
 */
export function useBridgeEvent<K extends keyof BridgeEvents>(
  event: K,
  handler: EventHandler<BridgeEvents[K]>,
  deps: React.DependencyList = []
): void {
  const handlerRef = useRef(handler);
  
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const stableHandler: EventHandler<BridgeEvents[K]> = (data) => {
      handlerRef.current(data);
    };
    
    bridgeBus.on(event, stableHandler);
    
    return () => {
      bridgeBus.off(event, stableHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

/**
 * Hook for emitting events - returns memoized emit functions
 * Useful when you need to emit events from callbacks
 */
export function useEmitSystemEvent() {
  return useCallback(
    <K extends keyof SystemEvents>(event: K, data: SystemEvents[K]) => {
      systemBus.emit(event, data);
    },
    []
  );
}

export function useEmitAppEvent() {
  return useCallback(
    <K extends keyof AppEvents>(event: K, data: AppEvents[K]) => {
      appBus.emit(event, data);
    },
    []
  );
}

