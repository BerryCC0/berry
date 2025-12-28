"use client";

/**
 * App Route Handler
 * Handles deep links to specific apps with optional parameters
 * 
 * This page is invisible - it triggers boot, waits for completion,
 * launches the app, and redirects. The BootOverlay on the main page
 * handles all visual feedback.
 * 
 * Examples:
 *   /app/calculator           → Opens Calculator
 *   /app/finder               → Opens Finder at root
 *   /app/finder/Documents     → Opens Finder at /Documents
 *   /app/settings             → Opens Settings
 */

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { appLauncher } from "@/OS/lib/AppLauncher";
import { osAppConfigs } from "@/OS/Apps/OSAppConfig";
import { useBootStore } from "@/OS/store/bootStore";
import { bootBerryOS } from "@/OS/lib/Boot";
import { BootOverlay } from "@/OS/components/BootOverlay";
import styles from "./page.module.css";

export default function AppRoute() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [notFound, setNotFound] = useState(false);
  
  // Track boot state - subscribe to all phases for the overlay
  const isBooting = useBootStore((state) => state.isBooting);
  const isBooted = useBootStore((state) => state.isBooted);
  const isWaitingForWallet = useBootStore((state) => state.isWaitingForWallet);
  const isLoadingData = useBootStore((state) => state.isLoadingData);
  const isReady = useBootStore((state) => state.isReady);
  
  // Prevent double-launch
  const hasLaunched = useRef(false);

  const appId = params.appId as string;
  const pathParams = (params.params as string[]) || [];

  // Trigger boot on mount if not already booted/booting
  useEffect(() => {
    if (!isBooted && !isBooting) {
      bootBerryOS();
    }
  }, [isBooted, isBooting]);

  // Wait for boot, then launch app
  useEffect(() => {
    // Don't do anything until boot is complete
    if (!isBooted) return;

    // Prevent double-launch
    if (hasLaunched.current) return;

    // Validate app exists in config
    const app = osAppConfigs.find((a) => a.id === appId);
    
    if (!app) {
      console.error(`[AppRoute] App not found: ${appId}`);
      setNotFound(true);
      
      // Redirect to desktop after a brief delay
      setTimeout(() => {
        router.push("/");
      }, 2000);
      return;
    }

    hasLaunched.current = true;

    // Build initial state from URL
    const initialState = buildInitialState(appId, pathParams, searchParams);

    // Build launch options
    const launchOptions: { initialState?: Record<string, unknown>; x?: number; y?: number } = { initialState };

    // Special positioning for wallet-panel: always top-right on desktop
    if (appId === "wallet-panel" && typeof window !== "undefined") {
      const MENU_BAR_HEIGHT = 24;
      const windowWidth = app.window.width;
      launchOptions.x = window.innerWidth - windowWidth;
      launchOptions.y = MENU_BAR_HEIGHT;
    }

    // Launch app with state and position
    appLauncher.launch(appId, launchOptions);

    // Navigate to root (app is now open as window)
    router.push("/");
  }, [isBooted, appId, pathParams, searchParams, router]);

  // Show the same BootOverlay used on the main page for consistent UX
  // Only show error state if app not found
  if (notFound) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.icon}>⚠️</div>
          <p className={styles.message}>App &quot;{appId}&quot; not found</p>
          <p className={styles.submessage}>Redirecting to desktop...</p>
        </div>
      </div>
    );
  }

  // Render the BootOverlay for consistent visual feedback
  return (
    <BootOverlay
      isBooting={isBooting}
      isWaitingForWallet={isWaitingForWallet}
      isLoadingData={isLoadingData}
      isReady={isReady}
    />
  );
}

/**
 * Sanitize a path segment or full path from URL
 * Prevents directory traversal and XSS
 */
function sanitizePath(path: string): string {
  let sanitized = decodeURIComponent(path);
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Remove directory traversal
  sanitized = sanitized
    .split('/')
    .filter(part => part !== '..' && part !== '.')
    .join('/');
  
  // Remove dangerous characters for XSS prevention
  sanitized = sanitized.replace(/[<>'"]/g, '');
  
  // Limit length
  sanitized = sanitized.slice(0, 500);
  
  return sanitized;
}

/**
 * Sanitize URL search params
 */
function sanitizeSearchParams(searchParams: URLSearchParams): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const allowedKeys = new Set(['file', 'id', 'path', 'view', 'panel']);
  
  searchParams.forEach((value, key) => {
    // Only allow whitelisted keys
    if (!allowedKeys.has(key)) return;
    
    // Sanitize value
    let safeValue = value.slice(0, 500);
    safeValue = safeValue.replace(/[<>'"]/g, '');
    sanitized[key] = safeValue;
  });
  
  return sanitized;
}

/**
 * Build initial state from URL parameters
 */
function buildInitialState(
  appId: string,
  pathParams: string[],
  searchParams: URLSearchParams
): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  
  // Sanitize path params
  const safeParams = pathParams.map(sanitizePath);
  const safeSearchParams = sanitizeSearchParams(searchParams);

  // Handle path params based on app
  switch (appId) {
    case "finder":
      // /app/finder/Documents/Projects → path: /Documents/Projects
      if (safeParams.length > 0) {
        state.path = "/" + safeParams.join("/");
      }
      break;

    case "media-viewer":
    case "image-viewer":
    case "movie-player":
    case "sound-jam":
      // /app/media-viewer/Pictures/photo.jpg → filePath: /Pictures/photo.jpg
      if (safeParams.length > 0) {
        state.filePath = "/" + safeParams.join("/");
      }
      break;

    case "text-editor":
      // /app/text-editor?file=/path/to/file.txt
      if (safeSearchParams.file) {
        state.filePath = sanitizePath(safeSearchParams.file);
      }
      break;
      
    case "pdf-viewer":
      // /app/pdf-viewer/Documents/file.pdf → filePath
      if (safeParams.length > 0) {
        state.filePath = "/" + safeParams.join("/");
      }
      break;

    case "settings":
      // /app/settings/appearance → panel: appearance
      if (safeParams.length > 0) {
        state.panel = safeParams[0];
      }
      break;

    case "wallet-panel":
      // /app/wallet-panel → no special params
      break;

    case "camp":
      // /app/camp/proposal/123 → path for internal routing
      // /app/camp/voter/0x123 → voter detail
      if (safeParams.length > 0) {
        state.path = safeParams.join("/");
      }
      break;

    case "nouns-auction":
      // /app/nouns-auction/123 → view specific noun
      if (safeParams.length > 0) {
        state.nounId = parseInt(safeParams[0], 10);
      }
      break;

    default:
      // Generic: pass sanitized search params as state
      Object.entries(safeSearchParams).forEach(([key, value]) => {
        state[key] = value;
      });
  }

  return state;
}

