/**
 * ActionTemplateDropdown Component
 * Custom dropdown for selecting action templates with category groups
 */

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import styles from './ActionTemplateDropdown.module.css';

interface TemplateOption {
  value: string;
  label: string;
  description?: string;
}

interface TemplateGroup {
  label: string;
  options: TemplateOption[];
}

interface ActionTemplateDropdownProps {
  groups: TemplateGroup[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Icon components for categories
function CategoryIcon({ category }: { category: string }) {
  const iconMap: Record<string, string> = {
    'Treasury Transfers': '💰',
    'Streams': '💸',
    'Token Buyer': '🔄',
    'Nouns Token': '⌐◨-◨',
    'Custom': '⚙️',
    'DAO Admin Functions': '🔐',
  };
  
  return <span className={styles.categoryIcon}>{iconMap[category] || '📋'}</span>;
}

export function ActionTemplateDropdown({
  groups,
  value,
  onChange,
  placeholder = 'Select action type...',
  disabled = false,
}: ActionTemplateDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find the selected option across all groups
  const selectedOption = useMemo(() => {
    for (const group of groups) {
      const found = group.options.find(opt => opt.value === value);
      if (found) return { ...found, group: group.label };
    }
    return null;
  }, [groups, value]);

  // Filter groups and options by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groups;
    
    const query = searchQuery.toLowerCase();
    return groups
      .map(group => ({
        ...group,
        options: group.options.filter(
          opt => opt.label.toLowerCase().includes(query) ||
                 opt.description?.toLowerCase().includes(query) ||
                 group.label.toLowerCase().includes(query)
        ),
      }))
      .filter(group => group.options.length > 0);
  }, [groups, searchQuery]);

  // Total option count for showing search
  const totalOptions = groups.reduce((sum, g) => sum + g.options.length, 0);

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

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.open : ''} ${value ? styles.hasValue : ''} ${disabled ? styles.disabled : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className={styles.triggerContent}>
          {selectedOption ? (
            <>
              <CategoryIcon category={selectedOption.group} />
              <span className={styles.triggerLabel}>{selectedOption.label}</span>
            </>
          ) : (
            <span className={styles.triggerPlaceholder}>{placeholder}</span>
          )}
        </span>
        <span className={styles.arrow}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {totalOptions > 5 && (
            <div className={styles.searchContainer}>
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchInput}
                placeholder="Search actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
          
          <div className={styles.optionsList} role="listbox">
            {/* Clear option */}
            <button
              type="button"
              className={`${styles.option} ${!value ? styles.selected : ''}`}
              onClick={() => handleSelect('')}
              role="option"
              aria-selected={!value}
            >
              <span className={styles.optionIcon}>—</span>
              <span className={styles.optionLabel}>{placeholder}</span>
            </button>

            {filteredGroups.map((group) => (
              <div key={group.label} className={styles.group}>
                <div className={styles.groupHeader}>
                  <CategoryIcon category={group.label} />
                  <span className={styles.groupLabel}>{group.label}</span>
                </div>
                
                {group.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.option} ${value === option.value ? styles.selected : ''}`}
                    onClick={() => handleSelect(option.value)}
                    role="option"
                    aria-selected={value === option.value}
                  >
                    <span className={styles.optionLabel}>{option.label}</span>
                    {option.description && (
                      <span className={styles.optionDescription}>{option.description}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}

            {filteredGroups.length === 0 && searchQuery && (
              <div className={styles.noResults}>No actions match &quot;{searchQuery}&quot;</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
