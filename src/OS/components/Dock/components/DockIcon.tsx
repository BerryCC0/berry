"use client";

/**
 * DockIcon Component
 * Individual dock icon with running indicator
 */

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

  return (
    <div className={iconClassName} onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={app.icon}
        alt={app.title}
        className={styles.dockIconImage}
        draggable={false}
        onError={(e) => {
          // Fallback to emoji if icon fails to load
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />

      <span className={styles.dockIconLabel}>{app.title}</span>

      {app.isRunning && <div className={indicatorClassName} />}
    </div>
  );
}

