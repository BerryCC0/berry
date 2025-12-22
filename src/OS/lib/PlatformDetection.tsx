"use client";

/**
 * Platform Detection
 * Detects and provides platform information across the app
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { PlatformInfo, PlatformType, Orientation } from "@/OS/types/platform";

/**
 * Get current orientation
 */
function getOrientation(): Orientation {
  if (typeof window === "undefined") return "landscape";
  return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
}

/**
 * Check if running in Farcaster miniapp context
 */
function isFarcasterContext(): boolean {
  if (typeof window === "undefined") return false;

  // Check for Farcaster SDK context
  const win = window as unknown as { sdk?: { context?: unknown } };
  return Boolean(win.sdk?.context);
}

/**
 * Check if device supports touch
 */
function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;

  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints is not in types
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Detect current platform
 */
export function detectPlatform(): PlatformInfo {
  // Server-side default
  if (typeof window === "undefined") {
    return {
      type: "desktop",
      isTouchDevice: false,
      screenWidth: 1920,
      screenHeight: 1080,
      orientation: "landscape",
      isFarcaster: false,
    };
  }

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const touchDevice = isTouchDevice();
  const orientation = getOrientation();

  // Check for Farcaster miniapp context first
  if (isFarcasterContext()) {
    return {
      type: "farcaster",
      isTouchDevice: true,
      screenWidth,
      screenHeight,
      orientation,
      isFarcaster: true,
    };
  }

  // Mobile: < 768px
  if (screenWidth < 768) {
    return {
      type: "mobile",
      isTouchDevice: touchDevice,
      screenWidth,
      screenHeight,
      orientation,
      isFarcaster: false,
    };
  }

  // Tablet: 768px - 1024px with touch
  if (touchDevice && screenWidth >= 768 && screenWidth <= 1024) {
    return {
      type: "tablet",
      isTouchDevice: true,
      screenWidth,
      screenHeight,
      orientation,
      isFarcaster: false,
    };
  }

  // Desktop: everything else
  return {
    type: "desktop",
    isTouchDevice: touchDevice,
    screenWidth,
    screenHeight,
    orientation,
    isFarcaster: false,
  };
}

/**
 * Platform Context
 */
const PlatformContext = createContext<PlatformInfo | null>(null);

/**
 * Platform Provider Props
 */
interface PlatformProviderProps {
  children: ReactNode;
}

/**
 * Platform Provider
 * Wraps the app and provides platform information
 */
export function PlatformProvider({ children }: PlatformProviderProps) {
  const [platform, setPlatform] = useState<PlatformInfo>(() => detectPlatform());

  useEffect(() => {
    // Update platform on resize
    const handleResize = () => {
      setPlatform(detectPlatform());
    };

    // Update platform on orientation change
    const handleOrientationChange = () => {
      setPlatform(detectPlatform());
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientationChange);

    // Initial detection after mount (in case SSR values differ)
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  return (
    <PlatformContext.Provider value={platform}>
      {children}
    </PlatformContext.Provider>
  );
}

/**
 * Hook to access platform information
 */
export function usePlatform(): PlatformInfo {
  const context = useContext(PlatformContext);

  if (!context) {
    throw new Error("usePlatform must be used within a PlatformProvider");
  }

  return context;
}

/**
 * Hook to check if platform is mobile-like (mobile or farcaster)
 */
export function useIsMobile(): boolean {
  const platform = usePlatform();
  return platform.type === "mobile" || platform.type === "farcaster";
}

/**
 * Hook to check if hover is supported
 */
export function useSupportsHover(): boolean {
  const platform = usePlatform();
  return platform.type === "desktop";
}

/**
 * Get platform type string (useful for conditional rendering)
 */
export function usePlatformType(): PlatformType {
  const platform = usePlatform();
  return platform.type;
}

