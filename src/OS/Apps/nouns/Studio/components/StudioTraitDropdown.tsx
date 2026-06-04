'use client';

/**
 * StudioTraitDropdown — Treasury-style trait picker adapted for editable
 * Studio layers.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { getTraitImageUrl } from '@/app/lib/nouns/utils/trait-image';
import type { TraitType } from '@/app/lib/nouns/utils/trait-name-utils';
import styles from './StudioTraitDropdown.module.css';

export interface StudioTraitOption {
  value: number;
  name: string;
}

interface StudioTraitDropdownProps {
  type: TraitType;
  options: StudioTraitOption[];
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
}

export function StudioTraitDropdown({
  type,
  options,
  value,
  onChange,
  placeholder,
}: StudioTraitDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((opt) =>
      `${opt.name} ${opt.value}`.toLowerCase().includes(query),
    );
  }, [options, searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  function handleSelect(next: number | null): void {
    onChange(next);
    setIsOpen(false);
    setSearchQuery('');
  }

  const displayLabel =
    selectedOption?.name ?? placeholder ?? `Choose ${type}`;

  return (
    <div
      className={styles.container}
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.open : ''} ${
          value !== null ? styles.hasValue : ''
        }`}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false);
            setSearchQuery('');
          } else if (event.key === 'Enter' && !isOpen) {
            setIsOpen(true);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.triggerContent}>
          {selectedOption && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getTraitImageUrl(type, selectedOption.value)}
              alt=""
              className={styles.triggerImage}
            />
          )}
          <span className={styles.triggerLabel}>{displayLabel}</span>
        </span>
        <span className={styles.arrow}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {options.length > 8 && (
            <div className={styles.searchContainer}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder={`Search ${type}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setIsOpen(false);
                    setSearchQuery('');
                  }
                }}
                autoFocus
              />
            </div>
          )}

          <div className={styles.optionsList} role="listbox">
            <button
              type="button"
              className={`${styles.option} ${value === null ? styles.selected : ''}`}
              onClick={() => handleSelect(null)}
              role="option"
              aria-selected={value === null}
            >
              <span className={styles.optionImagePlaceholder}>✎</span>
              <span className={styles.optionLabel}>Draw custom</span>
            </button>

            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.option} ${
                  value === option.value ? styles.selected : ''
                }`}
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={value === option.value}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getTraitImageUrl(type, option.value)}
                  alt=""
                  className={styles.optionImage}
                  loading="lazy"
                />
                <span className={styles.optionLabel}>
                  #{option.value} {option.name}
                </span>
              </button>
            ))}

            {filteredOptions.length === 0 && searchQuery && (
              <div className={styles.noResults}>
                No {type}s match &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
