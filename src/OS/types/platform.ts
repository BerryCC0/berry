/**
 * Platform Types
 * Defines platform detection and capabilities
 */

export type PlatformType = "desktop" | "tablet" | "mobile" | "farcaster";

export type Orientation = "portrait" | "landscape";

export interface PlatformInfo {
  type: PlatformType;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: Orientation;
  isFarcaster: boolean;
}

export interface PlatformCapabilities {
  supportsHover: boolean;
  supportsResize: boolean;
  supportsMultiWindow: boolean;
  supportsDrag: boolean;
  minTouchTarget: number;
}

/**
 * Get capabilities based on platform type
 */
export function getPlatformCapabilities(
  platform: PlatformType
): PlatformCapabilities {
  switch (platform) {
    case "desktop":
      return {
        supportsHover: true,
        supportsResize: true,
        supportsMultiWindow: true,
        supportsDrag: true,
        minTouchTarget: 28,
      };
    case "tablet":
      return {
        supportsHover: false,
        supportsResize: true,
        supportsMultiWindow: true,
        supportsDrag: true,
        minTouchTarget: 44,
      };
    case "mobile":
    case "farcaster":
      return {
        supportsHover: false,
        supportsResize: false,
        supportsMultiWindow: false,
        supportsDrag: false,
        minTouchTarget: 44,
      };
  }
}

