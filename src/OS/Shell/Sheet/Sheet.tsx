"use client";

/**
 * Sheet Component
 * iOS-style bottom sheet modal for mobile.
 *
 * Per HIG-SPEC-MOBILE §6:
 * - Slides up from bottom (300ms spring)
 * - Drag handle (36×5px pill) at top
 * - Title + Done button header
 * - Swipe down to dismiss (>30% height)
 * - Half-sheet support (expandable on swipe up)
 * - Tap backdrop to dismiss (configurable)
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Sheet.module.css";

export interface SheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Called when the sheet should close */
  onClose: () => void;
  /** Sheet title */
  title?: string;
  /** Whether tapping backdrop dismisses the sheet */
  dismissOnBackdrop?: boolean;
  /** Whether to start as a half-height sheet */
  halfSheet?: boolean;
  /** Custom done button label */
  doneLabel?: string;
  /** Children rendered in the sheet content area */
  children: ReactNode;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  dismissOnBackdrop = true,
  halfSheet = false,
  doneLabel = "Done",
  children,
}: SheetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Drag state
  const dragRef = useRef({
    startY: 0,
    currentY: 0,
    sheetHeight: 0,
    isActive: false,
  });

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      // Mount first, then trigger CSS transition
      setIsVisible(true);
    } else {
      setIsVisible(false);
      setIsExpanded(false);
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback(() => {
    if (dismissOnBackdrop) onClose();
  }, [dismissOnBackdrop, onClose]);

  // ── Drag-to-dismiss gesture ──

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch || !sheetRef.current) return;

    dragRef.current = {
      startY: touch.clientY,
      currentY: touch.clientY,
      sheetHeight: sheetRef.current.offsetHeight,
      isActive: true,
    };
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current.isActive) return;
    const touch = e.touches[0];
    if (!touch || !sheetRef.current) return;

    dragRef.current.currentY = touch.clientY;
    const deltaY = touch.clientY - dragRef.current.startY;

    // Only allow dragging downward (or upward for half-sheet expansion)
    if (deltaY > 0) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    } else if (halfSheet && !isExpanded && deltaY < -20) {
      // Swiping up on half-sheet → expand
      setIsExpanded(true);
      dragRef.current.isActive = false;
      setIsDragging(false);
      sheetRef.current.style.transform = "";
    }
  }, [halfSheet, isExpanded]);

  const handleTouchEnd = useCallback(() => {
    if (!dragRef.current.isActive || !sheetRef.current) {
      setIsDragging(false);
      return;
    }

    dragRef.current.isActive = false;
    setIsDragging(false);

    const deltaY = dragRef.current.currentY - dragRef.current.startY;
    const threshold = dragRef.current.sheetHeight * 0.3;

    if (deltaY > threshold) {
      // Dismiss
      onClose();
    }
    // Snap back
    sheetRef.current.style.transform = "";
  }, [onClose]);

  if (!isOpen) return null;

  const sheetClassName = [
    styles.sheet,
    isVisible ? styles.sheetVisible : "",
    halfSheet ? styles.sheetHalf : "",
    halfSheet && isExpanded ? styles.sheetHalfExpanded : "",
    isDragging ? styles.sheetDragging : "",
  ]
    .filter(Boolean)
    .join(" ");

  const backdropClassName = [
    styles.backdrop,
    isVisible ? styles.backdropVisible : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={backdropClassName} onClick={handleBackdropClick} />
      <div
        ref={sheetRef}
        className={sheetClassName}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Sheet"}
      >
        {/* Drag handle */}
        <div
          className={styles.dragHandle}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.dragHandlePill} />
        </div>

        {/* Header */}
        {title && (
          <div className={styles.sheetHeader}>
            <span className={styles.sheetTitle}>{title}</span>
            <button className={styles.sheetDoneButton} onClick={onClose}>
              {doneLabel}
            </button>
          </div>
        )}

        {/* Content */}
        <div className={styles.sheetContent}>{children}</div>
      </div>
    </>
  );
}
