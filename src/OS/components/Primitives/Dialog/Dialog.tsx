"use client";

/**
 * Dialog Component
 * Mac OS 8 style modal dialog
 */

import {
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
  type MouseEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "../Button";
import styles from "./Dialog.module.css";

export interface DialogAction {
  label: string;
  variant?: "default" | "primary";
  onClick?: () => void;
  /** Closes dialog after click */
  closeOnClick?: boolean;
}

interface DialogProps {
  /** Dialog visibility */
  open: boolean;
  /** Callback when dialog requests close */
  onClose: () => void;
  /** Dialog title */
  title?: string;
  /** Dialog content */
  children: ReactNode;
  /** Action buttons */
  actions?: DialogAction[];
  /** Show close button in title bar */
  showCloseButton?: boolean;
  /** Width of dialog */
  width?: number;
  /** Closes on Escape key */
  closeOnEscape?: boolean;
  /** Closes on backdrop click */
  closeOnBackdropClick?: boolean;
}

/**
 * Mac OS 8 style dialog
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  showCloseButton = true,
  width = 400,
  closeOnEscape = true,
  closeOnBackdropClick = true,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap and escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Focus the dialog
    dialogRef.current?.focus();

    // Prevent body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, closeOnEscape, onClose]);

  const handleBackdropClick = useCallback(
    (e: MouseEvent) => {
      if (e.target === e.currentTarget && closeOnBackdropClick) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose]
  );

  const handleActionClick = useCallback(
    (action: DialogAction) => {
      action.onClick?.();
      if (action.closeOnClick !== false) {
        onClose();
      }
    },
    [onClose]
  );

  if (!open) return null;

  // Use portal to render at document root
  return createPortal(
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        style={{ width }}
        tabIndex={-1}
      >
        {/* Title Bar */}
        {(title || showCloseButton) && (
          <div className={styles.titleBar}>
            <span className={styles.title}>{title || ""}</span>
            {showCloseButton && (
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close dialog"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={styles.content}>{children}</div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className={styles.actions}>
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "default"}
                onClick={() => handleActionClick(action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * Alert Dialog - simplified dialog for messages
 */
interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
}

export function AlertDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = "OK",
}: AlertDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      actions={[{ label: confirmLabel, variant: "primary" }]}
      width={300}
    >
      <p className={styles.alertMessage}>{message}</p>
    </Dialog>
  );
}

/**
 * Confirm Dialog - dialog with confirm/cancel
 */
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      actions={[
        { label: cancelLabel, variant: "default" },
        {
          label: confirmLabel,
          variant: "primary",
          onClick: onConfirm,
        },
      ]}
      width={320}
    >
      <p className={styles.alertMessage}>{message}</p>
    </Dialog>
  );
}

