"use client";

/**
 * TitleBar Component
 * Window title bar with controls and drag handle
 */

interface TitleBarProps {
  title: string;
  icon: string;
  isFocused: boolean;
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  styles: Record<string, string>;
  isMobile: boolean;
}

export function TitleBar({
  title,
  icon,
  isFocused,
  onDragStart,
  onClose,
  onMinimize,
  onMaximize,
  styles,
  isMobile,
}: TitleBarProps) {
  const titleBarClassName = [
    styles.titleBar,
    isFocused ? styles.titleBarFocused : "",
  ]
    .filter(Boolean)
    .join(" ");

  const titleTextClassName = [
    styles.titleText,
    !isFocused ? styles.titleTextBlurred : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if not clicking on controls
    if (!(e.target as HTMLElement).closest(`.${styles.windowControls}`)) {
      onDragStart(e);
    }
  };

  return (
    <div className={titleBarClassName} onMouseDown={handleMouseDown}>
      <div className={styles.windowControls}>
        <button
          className={`${styles.controlButton} ${styles.closeButton}`}
          onClick={onClose}
          aria-label="Close window"
        >
          {isMobile ? "×" : ""}
        </button>
        <button
          className={`${styles.controlButton} ${styles.minimizeButton}`}
          onClick={onMinimize}
          aria-label="Minimize window"
        >
          {isMobile ? "−" : ""}
        </button>
        <button
          className={`${styles.controlButton} ${styles.maximizeButton}`}
          onClick={onMaximize}
          aria-label="Maximize window"
        >
          {isMobile ? "+" : ""}
        </button>
      </div>

      {icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" className={styles.titleIcon} />
      )}

      <span className={titleTextClassName}>{title}</span>
    </div>
  );
}

