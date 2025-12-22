"use client";

/**
 * WindowManager Component
 * Renders all open windows with their app components
 */

import { useWindowStore } from "@/OS/store/windowStore";
import { Window } from "@/OS/components/Window";
import { AppErrorBoundary } from "@/OS/components/AppErrorBoundary";
import { appLauncher } from "@/OS/lib/AppLauncher";
import type { AppComponentProps } from "@/OS/types/app";

export function WindowManager() {
  const windows = useWindowStore((state) => state.windows);
  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const maximizeWindow = useWindowStore((state) => state.maximizeWindow);
  const updateWindowTitle = useWindowStore((state) => state.updateWindowTitle);
  const updateAppState = useWindowStore((state) => state.updateAppState);

  // Use appLauncher.close instead of windowStore.closeWindow directly
  // This ensures runningInstances tracking is properly cleaned up
  const handleCloseWindow = (windowId: string) => {
    appLauncher.close(windowId);
  };

  return (
    <>
      {Array.from(windows.values()).map((window) => {
        const appConfig = appLauncher.getConfig(window.appId);
        const AppComponent = appConfig?.component;

        // Build props for app component
        const appProps: AppComponentProps = {
          windowId: window.id,
          instanceId: window.instanceId,
          appId: window.appId,
          initialState: window.appState,
          onClose: () => handleCloseWindow(window.id),
          onMinimize: () => minimizeWindow(window.id),
          onMaximize: () => maximizeWindow(window.id),
          onTitleChange: (title: string) => updateWindowTitle(window.id, title),
          onStateChange: (state: unknown) => updateAppState(window.id, state),
        };

        return (
          <Window key={window.id} windowId={window.id}>
            <AppErrorBoundary
              appId={window.appId}
              appName={appConfig?.name || window.appId}
              windowId={window.id}
              onClose={() => handleCloseWindow(window.id)}
            >
              {AppComponent ? (
                <AppComponent {...appProps} />
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
      })}
    </>
  );
}
