"use client";

/**
 * SearchInput — debounced text input with submit-on-enter.
 *
 * Calls `onChange` continuously (debounced) AND `onSubmit` on Enter.
 * Lookup uses the debounced path; views with explicit search buttons
 * can use onSubmit instead.
 */

import { useEffect, useState } from "react";
import styles from "./SearchInput.module.css";

interface SearchInputProps {
  value: string;
  onChange: (next: string) => void;
  /** Debounce in ms. Default 250. */
  debounceMs?: number;
  /** Called on Enter or when the trailing button is clicked. */
  onSubmit?: (value: string) => void;
  placeholder?: string;
  /** Optional inline error / hint copy. */
  hint?: string;
  hintTone?: "muted" | "danger";
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChange,
  debounceMs = 250,
  onSubmit,
  placeholder,
  hint,
  hintTone = "muted",
  autoFocus = false,
}: SearchInputProps) {
  const [local, setLocal] = useState(value);

  // Keep local in sync if controlled value changes externally
  useEffect(() => {
    setLocal(value);
  }, [value]);

  // Debounce upward propagation
  useEffect(() => {
    if (local === value) return;
    const t = window.setTimeout(() => onChange(local), debounceMs);
    return () => window.clearTimeout(t);
  }, [local, value, debounceMs, onChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(local);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        type="text"
        className={styles.input}
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        autoFocus={autoFocus}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />
      {onSubmit && (
        <button type="submit" className={styles.submit}>
          Search
        </button>
      )}
      {hint && (
        <div className={`${styles.hint} ${styles[hintTone]}`}>{hint}</div>
      )}
    </form>
  );
}
