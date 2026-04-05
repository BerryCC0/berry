/**
 * TraitDropdown Component
 * Custom dropdown that shows Noun trait images in options
 */

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ImageData } from '@/app/lib/nouns/utils/image-data';
import { buildSVG } from '@/app/lib/nouns/utils/svg-builder';
import type { TraitType } from '@/app/lib/nouns/utils/trait-name-utils';
import styles from './TraitDropdown.module.css';

interface TraitOption {
  value: number;
  name: string;
}

interface TraitDropdownProps {
  type: TraitType;
  options: TraitOption[];
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
}

// Render a single trait part as SVG data URL
function getTraitImageUrl(type: TraitType, value: number): string {
  const paletteColors = ImageData.palette.map(c => c ? `#${c}` : 'transparent');
  
  // Get the trait image data
  let partData: { data: string } | undefined;
  
  switch (type) {
    case 'background':
      // Background is just a color, render a simple square
      const bgColor = `#${ImageData.bgcolors[value] || 'd5d7e1'}`;
      return `data:image/svg+xml,${encodeURIComponent(
        `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="${bgColor}"/></svg>`
      )}`;
    case 'body':
      partData = ImageData.images.bodies[value];
      break;
    case 'accessory':
      partData = ImageData.images.accessories[value];
      break;
    case 'head':
      partData = ImageData.images.heads[value];
      break;
    case 'glasses':
      partData = ImageData.images.glasses[value];
      break;
  }
  
  if (!partData) return '';
  
  // Build SVG with transparent background
  const svg = buildSVG([partData], paletteColors, 'transparent');
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function TraitDropdown({ type, options, value, onChange, placeholder }: TraitDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Find the selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(opt => opt.name.toLowerCase().includes(query));
  }, [options, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (event.key === 'Enter' && !isOpen) {
      setIsOpen(true);
    }
  };

  const handleSelect = (optionValue: number | null) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const displayLabel = selectedOption?.name || placeholder || type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.open : ''} ${value !== null ? styles.hasValue : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.triggerContent}>
          {selectedOption && (
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
          {options.length > 5 && (
            <div className={styles.searchContainer}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder={`Search ${type}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
          
          <div className={styles.optionsList} role="listbox">
            {/* Clear option */}
            <button
              type="button"
              className={`${styles.option} ${value === null ? styles.selected : ''}`}
              onClick={() => handleSelect(null)}
              role="option"
              aria-selected={value === null}
            >
              <span className={styles.optionImagePlaceholder}>—</span>
              <span className={styles.optionLabel}>All {type}s</span>
            </button>

            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.option} ${value === option.value ? styles.selected : ''}`}
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={value === option.value}
              >
                <img 
                  src={getTraitImageUrl(type, option.value)} 
                  alt="" 
                  className={styles.optionImage}
                  loading="lazy"
                />
                <span className={styles.optionLabel}>{option.name}</span>
              </button>
            ))}

            {filteredOptions.length === 0 && searchQuery && (
              <div className={styles.noResults}>No {type}s match &quot;{searchQuery}&quot;</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
