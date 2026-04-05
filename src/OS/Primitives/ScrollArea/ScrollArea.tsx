"use client";

/**
 * ScrollArea Component
 * Mac OS 8 style scrollable container with custom scrollbars
 */

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import styles from "./ScrollArea.module.css";

interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  /** Content to scroll */
  children: ReactNode;
  /** Maximum height before scrolling */
  maxHeight?: number | string;
  /** Whether to show horizontal scrollbar when needed */
  horizontal?: boolean;
  /** Whether to show vertical scrollbar when needed */
  vertical?: boolean;
}

/**
 * Mac OS 8 style scroll area
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  function ScrollArea(
    {
      children,
      maxHeight,
      horizontal = false,
      vertical = true,
      className,
      style,
      ...props
    },
    ref
  ) {
    const scrollClassName = [styles.scrollArea, className || ""]
      .filter(Boolean)
      .join(" ");

    const scrollStyle = {
      ...style,
      maxHeight: maxHeight,
      overflowX: horizontal ? "auto" : "hidden",
      overflowY: vertical ? "auto" : "hidden",
    } as React.CSSProperties;

    return (
      <div ref={ref} className={scrollClassName} style={scrollStyle} {...props}>
        {children}
      </div>
    );
  }
);

