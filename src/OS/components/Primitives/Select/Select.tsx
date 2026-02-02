"use client";

/**
 * Select Component
 * Custom dropdown/select with Berry OS styling
 */

import { useState, useRef, useEffect } from "react";
import styles from "./Select.module.css";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Shows a "None" option at the top */
  allowNone?: boolean;
  noneLabel?: string;
  /** Full width (default: true) */
  fullWidth?: boolean;
  className?: string;
}

/**
 * Custom select dropdown with Berry OS styling
 */
export function Select({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  allowNone = false,
  noneLabel = "None",
  fullWidth = true,
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find the selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    } else if (event.key === "Enter" && !isOpen) {
      setIsOpen(true);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  const containerClassName = [
    styles.container,
    fullWidth ? styles.fullWidth : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  const triggerClassName = [
    styles.trigger,
    isOpen ? styles.open : "",
    value ? styles.hasValue : "",
    disabled ? styles.disabled : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName} ref={containerRef}>
      <button
        type="button"
        className={triggerClassName}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className={styles.triggerContent}>
          {selectedOption ? (
            <span className={styles.triggerLabel}>{selectedOption.label}</span>
          ) : (
            <span className={styles.triggerPlaceholder}>{placeholder}</span>
          )}
        </span>
        <span className={styles.arrow}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.optionsList} role="listbox">
            {/* None option */}
            {allowNone && (
              <button
                type="button"
                className={`${styles.option} ${styles.noneOption} ${
                  !value ? styles.selected : ""
                }`}
                onClick={() => handleSelect("")}
                role="option"
                aria-selected={!value}
              >
                <span className={styles.optionLabel}>{noneLabel}</span>
              </button>
            )}

            {/* Regular options */}
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.option} ${
                  value === option.value ? styles.selected : ""
                }`}
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={value === option.value}
              >
                <span className={styles.optionLabel}>{option.label}</span>
                {option.description && (
                  <span className={styles.optionDescription}>
                    {option.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
