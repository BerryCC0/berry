/**
 * Camp - Nouns Governance
 * Comprehensive governance app with deep linking support
 * 
 * Routes:
 * - /camp                    → Activity feed
 * - /camp/proposals          → Proposals list
 * - /camp/proposal/{id}      → Single proposal
 * - /camp/c/{slug}           → Single candidate (clean URL)
 * - /camp/candidates         → Candidates list
 * - /camp/voters             → Voters list
 * - /camp/voter/{address}    → Single voter
 * - /camp/account            → Connected user's profile
 * - /camp/create             → Create proposal (requires wallet)
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useTranslation } from '@/OS/lib/i18n';
import { parseRoute, routeToPath, type CampRoute } from './types';
import {
  ActivityView,
  ProposalListView,
  ProposalDetailView,
  VoterListView,
  VoterDetailView,
  CandidateListView,
  CandidateDetailView,
  AccountView,
  CreateProposalView,
} from './views';
import { CommandPalette } from './components';
import styles from './Camp.module.css';

import type { AppComponentProps } from '@/OS/types/app';

interface CampInitialState {
  path?: string;
}

type TabId = 'activity' | 'proposals' | 'candidates' | 'voters' | 'account' | 'create';
type DigestTabId = 'digest' | 'proposals' | 'candidates' | 'voters';

export function Camp({ windowId, initialState, onStateChange }: AppComponentProps) {
  const { t } = useTranslation();
  
  // Cast initialState to our expected shape
  const campState = initialState as CampInitialState | undefined;
  
  // Wallet connection state
  const { isConnected } = useAccount();
  
  // Parse initial route from initialState
  const [route, setRoute] = useState<CampRoute>(() => parseRoute(campState?.path));
  const [history, setHistory] = useState<CampRoute[]>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  // Persist Digest tab selection across navigation
  const [digestTab, setDigestTab] = useState<DigestTabId>('digest');

  // Update route when initialState changes (deep link)
  useEffect(() => {
    if (campState?.path !== undefined) {
      const newRoute = parseRoute(campState.path);
      setRoute(newRoute);
    }
  }, [campState?.path]);

  // Navigate to a new route
  const navigate = useCallback((pathOrRoute: string | CampRoute) => {
    const newRoute = typeof pathOrRoute === 'string' 
      ? parseRoute(pathOrRoute) 
      : pathOrRoute;
    
    // Push current route to history
    setHistory(prev => [...prev, route]);
    setRoute(newRoute);
    
    // Notify parent for URL sync via state change
    const newPath = routeToPath(newRoute);
    onStateChange?.({ path: newPath });
  }, [route, onStateChange]);

  // Go back in history
  const goBack = useCallback(() => {
    if (history.length > 0) {
      const prevRoute = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setRoute(prevRoute);
      onStateChange?.({ path: routeToPath(prevRoute) });
    } else {
      // Default to activity
      setRoute({ view: 'activity' });
      onStateChange?.({ path: '' });
    }
  }, [history, onStateChange]);

  // Get current tab from route
  const getCurrentTab = (): TabId => {
    switch (route.view) {
      case 'activity':
        return 'activity';
      case 'proposals':
      case 'proposal':
        return 'proposals';
      case 'candidates':
      case 'candidate':
      case 'edit-candidate':
        return 'candidates';
      case 'voters':
      case 'voter':
      case 'vote':
        return 'voters';
      case 'account':
        return 'account';
      case 'create':
        return 'create';
      default:
        return 'activity';
    }
  };

  const currentTab = getCurrentTab();

  // Handle tab change
  const handleTabChange = (tab: TabId) => {
    switch (tab) {
      case 'activity':
        navigate({ view: 'activity' });
        break;
      case 'proposals':
        navigate({ view: 'proposals' });
        break;
      case 'candidates':
        navigate({ view: 'candidates' });
        break;
      case 'voters':
        navigate({ view: 'voters' });
        break;
      case 'account':
        navigate({ view: 'account' });
        break;
      case 'create':
        navigate({ view: 'create' });
        break;
    }
    setHistory([]); // Clear history on tab change
  };

  // Render current view
  const renderView = () => {
    switch (route.view) {
      case 'activity':
        return <ActivityView onNavigate={navigate} digestTab={digestTab} onDigestTabChange={setDigestTab} />;
      
      case 'proposals':
        return <ProposalListView onNavigate={navigate} onBack={goBack} />;
      
      case 'proposal':
        return (
          <ProposalDetailView 
            proposalId={route.id} 
            onNavigate={navigate}
            onBack={goBack}
          />
        );
      
      case 'candidates':
        return <CandidateListView onNavigate={navigate} onBack={goBack} />;
      
      case 'candidate':
        return (
          <CandidateDetailView 
            proposer={route.proposer}
            slug={route.slug}
            onNavigate={navigate}
            onBack={goBack}
          />
        );
      
      case 'voters':
        return <VoterListView onNavigate={navigate} onBack={goBack} />;
      
      case 'voter':
        return (
          <VoterDetailView 
            address={route.address}
            onNavigate={navigate}
            onBack={goBack}
          />
        );
      
      case 'account':
        return <AccountView onNavigate={navigate} onBack={goBack} />;
      
      case 'create':
        return (
          <CreateProposalView 
            onNavigate={navigate}
            onBack={goBack}
            initialDraftSlug={route.draftSlug}
          />
        );
      
      case 'edit-candidate':
        return (
          <CreateProposalView 
            onNavigate={navigate}
            onBack={goBack}
            editCandidateProposer={route.proposer}
            editCandidateSlug={route.slug}
          />
        );
      
      case 'edit-proposal':
        return (
          <CreateProposalView 
            onNavigate={navigate}
            onBack={goBack}
            editProposalId={route.proposalId}
          />
        );
      
      default:
        return <ActivityView onNavigate={navigate} />;
    }
  };

  return (
    <div className={styles.camp}>
      {/* Header with logo, search, and action buttons */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <img 
            src="/icons/camp.svg" 
            alt="Camp" 
            className={styles.logo}
          />
          
          {/* Search bar - opens command palette */}
          <button
            className={styles.searchButton}
            onClick={() => setIsCommandPaletteOpen(true)}
          >
            <span className={styles.searchPlaceholder}>Search...</span>
          </button>
        </div>

        {/* Right buttons - wallet-only */}
        {isConnected && (
          <div className={styles.tabsRight}>
            <button
              className={`${styles.tab} ${currentTab === 'create' ? styles.active : ''}`}
              onClick={() => handleTabChange('create')}
            >
              {t('camp.create.title')}
            </button>
            <button
              className={`${styles.tab} ${currentTab === 'account' ? styles.active : ''}`}
              onClick={() => handleTabChange('account')}
            >
              {t('camp.tabs.account')}
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className={styles.content}>
        {renderView()}
      </div>
      
      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={navigate}
      />
    </div>
  );
}

export default Camp;

