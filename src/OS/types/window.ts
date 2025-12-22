/**
 * Window Types
 * Defines window state and configuration
 */

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowConstraints {
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface WindowState {
  id: string;
  appId: string;
  instanceId: string;
  title: string;
  icon: string;

  // Position & size
  x: number;
  y: number;
  width: number;
  height: number;

  // Constraints
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  isResizable: boolean;

  // State flags
  isFocused: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;

  // App state (opaque to window system)
  appState?: unknown;
}

export interface WindowConfig {
  title: string;
  icon: string;

  // Initial position & size
  x?: number;
  y?: number;
  width: number;
  height: number;

  // Constraints
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  isResizable?: boolean;

  // Initial state
  initialState?: unknown;
}

/**
 * Default window constraints
 */
export const DEFAULT_WINDOW_CONSTRAINTS: WindowConstraints = {
  minWidth: 200,
  minHeight: 150,
};

/**
 * Generate a unique window ID
 */
export function generateWindowId(): string {
  return `win-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique instance ID for an app
 */
export function generateInstanceId(appId: string): string {
  return `${appId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

