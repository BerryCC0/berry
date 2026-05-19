/**
 * HoverPopover
 * Generic hover-to-show popover. Wraps a trigger (any children) and renders
 * `content` in a body-portal'd floating panel positioned just below the
 * trigger. Stays open while the cursor is over either the trigger or the
 * popover, so users can move into the popover to click links inside.
 *
 * Disabled automatically on coarse pointers (touch) — the trigger's own
 * onClick still works there.
 */

'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './HoverPopover.module.css';

interface HoverPopoverProps {
  /** Rendered inside the floating panel when open. */
  content: ReactNode;
  /** The trigger; gets mouse enter/leave listeners attached. */
  children: ReactNode;
  /** ms before the popover opens after mouse enter. Default 300. */
  openDelay?: number;
  /**
   * ms before the popover closes after mouse leave. Default 150. Keeping
   * this small but non-zero lets users move the cursor across the small
   * gap between trigger and popover without flickering.
   */
  closeDelay?: number;
}

export function HoverPopover({
  content,
  children,
  openDelay = 300,
  closeDelay = 150,
}: HoverPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const openTimerRef = useRef<number | undefined>(undefined);
  const closeTimerRef = useRef<number | undefined>(undefined);

  // Disable hover behavior on touch devices — there's no hover to detect.
  const supportsHover =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover)').matches;

  const computePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Default: just below trigger, aligned with its left edge.
    const top = rect.bottom + 4 + window.scrollY;
    const left = rect.left + window.scrollX;
    setPosition({ top, left });
  }, []);

  const handleMouseEnterTrigger = useCallback(() => {
    if (!supportsHover) return;
    window.clearTimeout(closeTimerRef.current);
    openTimerRef.current = window.setTimeout(() => {
      computePosition();
      setIsOpen(true);
    }, openDelay);
  }, [supportsHover, openDelay, computePosition]);

  const handleMouseLeaveTrigger = useCallback(() => {
    if (!supportsHover) return;
    window.clearTimeout(openTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, closeDelay);
  }, [supportsHover, closeDelay]);

  // Hovering into the popover cancels the pending close so users can
  // interact with content inside it.
  const handleMouseEnterPopover = useCallback(() => {
    window.clearTimeout(closeTimerRef.current);
  }, []);

  const handleMouseLeavePopover = useCallback(() => {
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, closeDelay);
  }, [closeDelay]);

  // Escape closes; reposition on scroll/resize while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const onScrollOrResize = () => computePosition();
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isOpen, computePosition]);

  // Cleanup pending timers on unmount.
  useEffect(() => {
    return () => {
      window.clearTimeout(openTimerRef.current);
      window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        className={styles.trigger}
        onMouseEnter={handleMouseEnterTrigger}
        onMouseLeave={handleMouseLeaveTrigger}
      >
        {children}
      </span>
      {isOpen &&
        position &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={styles.popover}
            style={{ top: position.top, left: position.left }}
            onMouseEnter={handleMouseEnterPopover}
            onMouseLeave={handleMouseLeavePopover}
            role="tooltip"
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
