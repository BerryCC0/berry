"use client";

/**
 * DockIcon Component
 * Individual dock icon with running indicator
 */

import { useState } from "react";

interface DockApp {
  appId: string;
  title: string;
  icon: string;
  windowId?: string;
  isRunning: boolean;
  isMinimized: boolean;
  isFocused: boolean;
}

interface DockIconProps {
  app: DockApp;
  onClick: () => void;
  styles: Record<string, string>;
}

export function DockIcon({ app, onClick, styles }: DockIconProps) {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const iconClassName = [
    styles.dockIcon,
    app.isFocused ? styles.dockIconFocused : "",
  ]
    .filter(Boolean)
    .join(" ");

  const indicatorClassName = [
    styles.runningIndicator,
    app.isMinimized ? styles.minimizedIndicator : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Get first letter for fallback
  const firstLetter = app.title.charAt(0).toUpperCase();

  return (
    <div className={iconClassName} onClick={onClick}>
      {!imageLoadFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={app.icon}
          alt={app.title}
          className={styles.dockIconImage}
          draggable={false}
          onError={() => {
            setImageLoadFailed(true);
          }}
        />
      ) : (
        // Fallback: show first letter of app title
        <div
          className={styles.dockIconImage}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#808080",
            color: "#ffffff",
            fontSize: "20px",
            fontWeight: "bold",
            width: "100%",
            height: "100%",
            borderRadius: "4px",
          }}
        >
          {firstLetter}
        </div>
      )}

      <span className={styles.dockIconLabel}>{app.title}</span>

      {app.isRunning && <div className={indicatorClassName} />}
    </div>
  );
}

