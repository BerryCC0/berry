/**
 * ProbeSelect Component
 * probe.wtf-styled dropdown — Comic Neue Bold, thick borders,
 * label inside the trigger box, large NONE placeholder.
 * Includes a type-to-search input when the dropdown is open.
 */

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { SelectOption } from '@/OS/components/Primitives/Select';
import styles from './ProbeSelect.module.css';

interface ProbeSelectProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ProbeSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'NONE',
}: ProbeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options by search query (match label or value)
  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Focus search input when dropdown opens, clear search when it closes
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the input is rendered
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const handleSelect = (v: string) => {
    onChange(v);
    setIsOpen(false);
  };

  // Only show search bar when there are enough options to warrant it
  const showSearch = options.length > 10;

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedOption.icon} alt="" className={styles.icon} />
              )}
              {selectedOption.label}
            </>
          ) : (
            placeholder
          )}
        </span>
        <span className={styles.chevron}>›</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {showSearch && (
            <div className={styles.searchBox}>
              <input
                ref={searchRef}
                type="text"
                className={styles.searchInput}
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
              />
            </div>
          )}
          <div className={styles.list}>
            {/* None / reset option (always visible) */}
            {!search && (
              <button
                type="button"
                className={`${styles.option} ${!value ? styles.selected : ''}`}
                onClick={() => handleSelect('')}
              >
                <span className={styles.optionLabel}>{placeholder}</span>
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className={styles.noResults}>No matches</div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.option} ${value === opt.value ? styles.selected : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={opt.icon} alt="" className={styles.optionIcon} />
                  )}
                  <span className={styles.optionLabel}>{opt.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
