/**
 * CommandPalette Component
 * A modal search/navigation interface for Camp
 * 
 * Features:
 * - Quick navigation to all Camp views
 * - Search across proposals, candidates, voters
 * - Keyboard navigation support
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useProposals, useCandidates, useVoters } from '../hooks';
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

export function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const { isConnected } = useAccount();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Fetch data for search
  const { data: proposals } = useProposals(100, 'all', 'newest');
  const { data: candidates } = useCandidates(50);
  const { data: voters } = useVoters(50);
  
  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
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
    
    // Topics section
    commands.push({
      id: 'browse-topics',
      label: 'Browse Discussion Topics',
      section: 'Topics',
      action: () => { onNavigate('candidates'); onClose(); }, // Topics are like candidates
    });
    
    if (isConnected) {
      commands.push({
        id: 'create-topic',
        label: 'Create Discussion Topic...',
        section: 'Topics',
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
    
    // Camp section
    commands.push({
      id: 'settings',
      label: 'Settings',
      section: 'Camp',
      action: () => { appLauncher.launch('settings'); onClose(); },
    });
    
    return commands;
  }, [isConnected, onNavigate, onClose]);
  
  // Build search results
  const searchResults = useMemo<CommandItem[]>(() => {
    if (!query.trim()) return [];
    
    const normalizedQuery = query.toLowerCase().trim();
    const results: CommandItem[] = [];
    
    // Search proposals
    if (proposals) {
      const matchingProposals = proposals.filter(p => 
        p.id.includes(normalizedQuery) ||
        p.title.toLowerCase().includes(normalizedQuery) ||
        p.proposer.toLowerCase().includes(normalizedQuery)
      ).slice(0, 5);
      
      matchingProposals.forEach(p => {
        results.push({
          id: `proposal-${p.id}`,
          label: p.title,
          section: 'Proposals',
          meta: formatAddress(p.proposer),
          icon: `Prop ${p.id}`,
          action: () => { onNavigate(`proposal/${p.id}`); onClose(); },
        });
      });
    }
    
    // Search candidates
    if (candidates) {
      const matchingCandidates = candidates.filter(c => 
        c.slug.toLowerCase().includes(normalizedQuery) ||
        (c.title && c.title.toLowerCase().includes(normalizedQuery)) ||
        c.proposer.toLowerCase().includes(normalizedQuery)
      ).slice(0, 5);
      
      matchingCandidates.forEach(c => {
        results.push({
          id: `candidate-${c.proposer}-${c.slug}`,
          label: c.title || formatSlugToTitle(c.slug),
          section: 'Candidates',
          meta: formatAddress(c.proposer),
          action: () => { onNavigate(`candidate/${c.proposer}/${c.slug}`); onClose(); },
        });
      });
    }
    
    // Search voters
    if (voters) {
      const matchingVoters = voters.filter(v => 
        v.id.toLowerCase().includes(normalizedQuery)
      ).slice(0, 5);
      
      matchingVoters.forEach(v => {
        results.push({
          id: `voter-${v.id}`,
          label: formatAddress(v.id),
          section: 'Voters',
          action: () => { onNavigate(`voter/${v.id}`); onClose(); },
        });
      });
    }
    
    return results;
  }, [query, proposals, candidates, voters, onNavigate, onClose]);
  
  // Combined items (search results or navigation)
  const items = query.trim() ? searchResults : navigationCommands;
  
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
          {groupedItems.length === 0 ? (
            <div className={styles.empty}>No results found</div>
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
