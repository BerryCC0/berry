/**
 * CommandPalette Component
 * A modal search/navigation interface for Camp
 * 
 * Features:
 * - Quick navigation to all Camp views
 * - Search across proposals, candidates, voters (with partial ENS matching)
 * - Keyboard navigation support
 * - Uses /api/camp/search for database-backed partial text search
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, useEnsAddress } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { appLauncher } from '@/OS/lib/AppLauncher';
import styles from './CommandPalette.module.css';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

interface CommandItem {
  id: string;
  label: string;
  section: string;
  action: () => void;
  meta?: string; // Right-side text like ENS name or proposal ID
  icon?: string;
}

// Search API response types
interface SearchResults {
  voters: Array<{
    address: string;
    ensName: string | null;
    delegatedVotes: number;
  }>;
  proposals: Array<{
    id: number;
    title: string;
    status: string;
    proposer: string;
  }>;
  candidates: Array<{
    id: string;
    slug: string;
    title: string | null;
    proposer: string;
  }>;
}

// Check if a string looks like an ENS name
function isEnsName(input: string): boolean {
  return input.includes('.') && !input.startsWith('0x');
}

// Check if a string looks like an Ethereum address
function isEthAddress(input: string): boolean {
  return input.startsWith('0x') && input.length >= 6;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const { isConnected } = useAccount();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Debounce the search query
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebounce(trimmedQuery, 200);
  
  // Check if query looks like ENS or address for direct resolution
  const isQueryEns = isEnsName(trimmedQuery);
  const isQueryAddress = isEthAddress(trimmedQuery);
  
  // Resolve ENS name to address if query looks like a full ENS name (fallback)
  const { data: resolvedAddress } = useEnsAddress({
    name: isQueryEns && trimmedQuery.endsWith('.eth') ? trimmedQuery : undefined,
    chainId: mainnet.id,
  });
  
  // Fetch search results from API
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSearchResults(null);
      return;
    }
    
    const controller = new AbortController();
    
    async function fetchResults() {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/camp/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`,
          { signal: controller.signal }
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('[CommandPalette] Search error:', error);
        }
      } finally {
        setIsSearching(false);
      }
    }
    
    fetchResults();
    
    return () => controller.abort();
  }, [debouncedQuery]);
  
  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setSearchResults(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);
  
  // Build navigation commands
  const navigationCommands = useMemo<CommandItem[]>(() => {
    const commands: CommandItem[] = [];
    
    // Proposals section
    commands.push({
      id: 'browse-proposals',
      label: 'Browse proposals',
      section: 'Proposals',
      action: () => { onNavigate('proposals'); onClose(); },
    });
    commands.push({
      id: 'browse-candidates',
      label: 'Browse candidates',
      section: 'Proposals',
      action: () => { onNavigate('candidates'); onClose(); },
    });
    
    if (isConnected) {
      commands.push({
        id: 'create-proposal',
        label: 'Create Proposal...',
        section: 'Proposals',
        action: () => { onNavigate('create'); onClose(); },
      });
      commands.push({
        id: 'create-candidate',
        label: 'Create Candidate...',
        section: 'Proposals',
        action: () => { onNavigate('create'); onClose(); },
      });
    }
    
    // Connected account section
    if (isConnected) {
      commands.push({
        id: 'view-account',
        label: 'View Account',
        section: 'Connected account',
        action: () => { onNavigate('account'); onClose(); },
      });
      commands.push({
        id: 'view-drafts',
        label: 'View Drafts',
        section: 'Connected account',
        action: () => { onNavigate('account'); onClose(); },
      });
      commands.push({
        id: 'edit-profile',
        label: 'Edit Public Profile...',
        section: 'Connected account',
        action: () => { onNavigate('account'); onClose(); },
      });
    }
    
    // DAO section
    commands.push({
      id: 'auction',
      label: 'Auction',
      section: 'DAO',
      action: () => { appLauncher.launch('nouns-auction'); onClose(); },
    });
    commands.push({
      id: 'voters',
      label: 'Voters',
      section: 'DAO',
      action: () => { onNavigate('voters'); onClose(); },
    });
    commands.push({
      id: 'treasury',
      label: 'Treasury',
      section: 'DAO',
      action: () => { appLauncher.launch('treasury'); onClose(); },
    });
    
    return commands;
  }, [isConnected, onNavigate, onClose]);
  
  // Build search results from API response
  const searchItems = useMemo<CommandItem[]>(() => {
    if (!trimmedQuery || trimmedQuery.length < 2) return [];
    
    const normalizedQuery = trimmedQuery.toLowerCase();
    const results: CommandItem[] = [];
    
    // If user typed a full ENS name that resolved to an address, add direct navigation
    if (isQueryEns && resolvedAddress) {
      results.push({
        id: `voter-ens-${resolvedAddress}`,
        label: trimmedQuery,
        section: 'Voters',
        meta: formatAddress(resolvedAddress),
        action: () => { onNavigate(`voter/${resolvedAddress}`); onClose(); },
      });
    }
    
    // If user typed a full address, add direct navigation option
    if (isQueryAddress && normalizedQuery.length === 42) {
      results.push({
        id: `voter-direct-${normalizedQuery}`,
        label: formatAddress(normalizedQuery),
        section: 'Voters',
        meta: 'Go to voter',
        action: () => { onNavigate(`voter/${normalizedQuery}`); onClose(); },
      });
    }
    
    // Add results from API search
    if (searchResults) {
      // Add voters (with ENS names from database)
      searchResults.voters.forEach(v => {
        // Skip if already added via direct ENS resolution
        if (resolvedAddress && v.address.toLowerCase() === resolvedAddress.toLowerCase()) {
          return;
        }
        results.push({
          id: `voter-${v.address}`,
          label: v.ensName || formatAddress(v.address),
          section: 'Voters',
          meta: v.ensName ? formatAddress(v.address) : `${v.delegatedVotes} votes`,
          action: () => { onNavigate(`voter/${v.address}`); onClose(); },
        });
      });
      
      // Add proposals
      searchResults.proposals.forEach(p => {
        results.push({
          id: `proposal-${p.id}`,
          label: p.title,
          section: 'Proposals',
          meta: `Prop ${p.id}`,
          icon: p.status,
          action: () => { onNavigate(`proposal/${p.id}`); onClose(); },
        });
      });
      
      // Add candidates
      searchResults.candidates.forEach(c => {
        results.push({
          id: `candidate-${c.id}`,
          label: c.title || formatSlugToTitle(c.slug),
          section: 'Candidates',
          meta: formatAddress(c.proposer),
          action: () => { onNavigate(`c/${c.slug}`); onClose(); },
        });
      });
    }
    
    return results;
  }, [trimmedQuery, isQueryEns, isQueryAddress, resolvedAddress, searchResults, onNavigate, onClose]);
  
  // Combined items (search results or navigation)
  const items = query.trim() ? searchItems : navigationCommands;
  
  // Group items by section
  const groupedItems = useMemo(() => {
    const groups: { section: string; items: CommandItem[] }[] = [];
    const sectionMap = new Map<string, CommandItem[]>();
    
    items.forEach(item => {
      if (!sectionMap.has(item.section)) {
        sectionMap.set(item.section, []);
      }
      sectionMap.get(item.section)!.push(item);
    });
    
    sectionMap.forEach((items, section) => {
      groups.push({ section, items });
    });
    
    return groups;
  }, [items]);
  
  // Flatten for keyboard navigation
  const flatItems = useMemo(() => items, [items]);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          flatItems[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [flatItems, selectedIndex, onClose]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);
  
  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);
  
  if (!isOpen) return null;
  
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Navigate Camp..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button className={styles.clearButton} onClick={() => setQuery('')}>
              ×
            </button>
          )}
        </div>
        
        {/* Results list */}
        <div className={styles.list} ref={listRef}>
          {isSearching && trimmedQuery.length >= 2 ? (
            <div className={styles.empty}>Searching...</div>
          ) : groupedItems.length === 0 && trimmedQuery.length >= 2 ? (
            <div className={styles.empty}>No results found</div>
          ) : groupedItems.length === 0 ? (
            <div className={styles.empty}>Type to search voters, proposals, candidates...</div>
          ) : (
            groupedItems.map(group => (
              <div key={group.section} className={styles.section}>
                <div className={styles.sectionHeader}>{group.section}</div>
                {group.items.map((item, idx) => {
                  const globalIndex = flatItems.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      data-index={globalIndex}
                      className={`${styles.item} ${globalIndex === selectedIndex ? styles.selected : ''}`}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                    >
                      <div className={styles.itemLeft}>
                        {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
                        <span className={styles.itemLabel}>{item.label}</span>
                      </div>
                      {item.meta && <span className={styles.itemMeta}>{item.meta}</span>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatAddress(address: string): string {
  // TODO: Use ENS resolver
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatSlugToTitle(slug: string): string {
  return slug
    .replace(/---+/g, ' - ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/^./, c => c.toUpperCase());
}
