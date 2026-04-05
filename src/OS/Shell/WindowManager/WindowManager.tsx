"use client";

/**
 * WindowManager Component
 * Renders all open windows with their app components
 *
 * PERFORMANCE: Subscribes to window IDs only. Each window renders in its own
 * memoized WindowWrapper component that individually subscribes to its state.
 * This prevents all windows from re-rendering when any single window moves/resizes.
 *
 * Apps are lazy-loaded and wrapped in Suspense for code splitting
 */

import { Suspense, memo, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { useWindowStore } from "@/OS/store/windowStore";
import { Window } from "@/OS/Shell/Window";
import { AppErrorBoundary } from "@/OS/Shell/AppErrorBoundary";
import { appLauncher } from "@/OS/lib/AppLauncher";
import type { AppComponentProps } from "@/OS/types/app";

/**
 * Loading fallback for lazy-loaded app components
 */
function AppLoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      fontFamily: 'var(--berry-font-system)',
      fontSize: 12,
      color: 'var(--berry-text-secondary)',
    }}>
      Loading...
    </div>
  );
}

/**
 * Individual window wrapper that subscribes to its own window state
 * Memoized to prevent re-renders when other windows change
 */
const WindowWrapper = memo(function WindowWrapper({ windowId }: { windowId: string }) {
  // Subscribe only to this specific window's state (useShallow for stable reference)
  const window = useWindowStore(useShallow((state) => state.windows.get(windowId)));
  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const maximizeWindow = useWindowStore((state) => state.maximizeWindow);
  const updateWindowTitle = useWindowStore((state) => state.updateWindowTitle);
  const updateAppState = useWindowStore((state) => state.updateAppState);

  // Window may have been closed before this component re-renders
  if (!window) return null;

  const appConfig = appLauncher.getConfig(window.appId);
  const AppComponent = appConfig?.component;

  // Use appLauncher.close instead of windowStore.closeWindow directly
  // This ensures runningInstances tracking is properly cleaned up
  const handleCloseWindow = () => {
    appLauncher.close(windowId);
  };

  // Build props for app component
  const appProps: AppComponentProps = {
    windowId: window.id,
    instanceId: window.instanceId,
    appId: window.appId,
    initialState: window.appState,
    onClose: handleCloseWindow,
    onMinimize: () => minimizeWindow(windowId),
    onMaximize: () => maximizeWindow(windowId),
    onTitleChange: (title: string) => updateWindowTitle(windowId, title),
    onStateChange: (state: unknown) => updateAppState(windowId, state),
  };

  return (
    <Window key={windowId} windowId={windowId}>
      <AppErrorBoundary
        appId={window.appId}
        appName={appConfig?.name || window.appId}
        windowId={windowId}
        onClose={handleCloseWindow}
      >
        {AppComponent ? (
          <Suspense fallback={<AppLoadingFallback />}>
            <AppComponent {...appProps} />
          </Suspense>
        ) : (
          // Fallback for unregistered apps
          <div
            style={{
              padding: 16,
              fontFamily: "var(--berry-font-system)",
              fontSize: 12,
            }}
          >
            <h2>{window.title}</h2>
            <p>App ID: {window.appId}</p>
            <p>Window ID: {window.id}</p>
            <p>Instance ID: {window.instanceId}</p>
          </div>
        )}
      </AppErrorBoundary>
    </Window>
  );
});

export function WindowManager() {
  // Subscribe to the window IDs — useShallow ensures stable reference
  // (getWindowIds() creates a new array each call, which breaks useSyncExternalStore)
  const windowIds = useWindowStore(useShallow((state) => Array.from(state.windows.keys())));

  return (
    <>
      {windowIds.map((windowId) => (
        <WindowWrapper key={windowId} windowId={windowId} />
      ))}
    </>
  );
}
