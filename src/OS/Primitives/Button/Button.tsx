"use client";

/**
 * Button Component
 * Mac OS 8 style button with various variants
 */

import { forwardRef, type ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "default" | "primary" | "text" | "icon";
export type ButtonSize = "small" | "medium" | "large";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Makes button fill container width */
  fullWidth?: boolean;
  /** Active/pressed state */
  active?: boolean;
}

/**
 * Mac OS 8 style button
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "default",
      size = "medium",
      fullWidth = false,
      active = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) {
    const buttonClassName = [
      styles.button,
      styles[variant],
      styles[size],
      fullWidth ? styles.fullWidth : "",
      active ? styles.active : "",
      disabled ? styles.disabled : "",
      className || "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        className={buttonClassName}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

