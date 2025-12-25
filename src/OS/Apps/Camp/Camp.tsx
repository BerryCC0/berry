/**
 * Camp - Nouns Governance
 * Comprehensive governance app with deep linking support
 * 
 * Routes:
 * - /app/camp                    → Activity feed
 * - /app/camp/proposals          → Proposals list
 * - /app/camp/proposal/{id}      → Single proposal
 * - /app/camp/voters             → Voters list
 * - /app/camp/voter/{address}    → Single voter
 * - /app/camp/account            → Connected user's profile
 * - /app/camp/create             → Create proposal (requires wallet)
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
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
import styles from './Camp.module.css';

import type { AppComponentProps } from '@/OS/types/app';

interface CampInitialState {
  path?: string;
}

type TabId = 'activity' | 'proposals' | 'candidates' | 'voters' | 'account' | 'create';

export function Camp({ windowId, initialState, onStateChange }: AppComponentProps) {
  // Cast initialState to our expected shape
  const campState = initialState as CampInitialState | undefined;
  
  // Wallet connection state
  const { isConnected } = useAccount();
  
  // Parse initial route from initialState
  const [route, setRoute] = useState<CampRoute>(() => parseRoute(campState?.path));
  const [history, setHistory] = useState<CampRoute[]>([]);

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
        return <ActivityView onNavigate={navigate} />;
      
      case 'proposals':
        return <ProposalListView onNavigate={navigate} />;
      
      case 'proposal':
        return (
          <ProposalDetailView 
            proposalId={route.id} 
            onNavigate={navigate}
            onBack={goBack}
          />
        );
      
      case 'candidates':
        return <CandidateListView onNavigate={navigate} />;
      
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
        return <VoterListView onNavigate={navigate} />;
      
      case 'voter':
        return (
          <VoterDetailView 
            address={route.address}
            onNavigate={navigate}
            onBack={goBack}
          />
        );
      
      case 'account':
        return <AccountView onNavigate={navigate} />;
      
      case 'create':
        return (
          <CreateProposalView 
            onNavigate={navigate}
            onBack={goBack}
          />
        );
      
      default:
        return <ActivityView onNavigate={navigate} />;
    }
  };

  return (
    <div className={styles.camp}>
      {/* Header with logo and tabs */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <img 
            src="/icons/camp.svg" 
            alt="Camp" 
            className={styles.logo}
          />
          
          {/* Left tabs - public */}
          <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${currentTab === 'activity' ? styles.active : ''}`}
            onClick={() => handleTabChange('activity')}
          >
            Activity
          </button>
          <button
            className={`${styles.tab} ${currentTab === 'proposals' ? styles.active : ''}`}
            onClick={() => handleTabChange('proposals')}
          >
            Proposals
          </button>
          <button
            className={`${styles.tab} ${currentTab === 'candidates' ? styles.active : ''}`}
            onClick={() => handleTabChange('candidates')}
          >
            Candidates
          </button>
          <button
            className={`${styles.tab} ${currentTab === 'voters' ? styles.active : ''}`}
            onClick={() => handleTabChange('voters')}
          >
            Voters
          </button>
          </div>
        </div>

        {/* Right tabs - wallet-only */}
        {isConnected && (
          <div className={styles.tabsRight}>
            <button
              className={`${styles.tab} ${currentTab === 'create' ? styles.active : ''}`}
              onClick={() => handleTabChange('create')}
            >
              Create
            </button>
            <button
              className={`${styles.tab} ${currentTab === 'account' ? styles.active : ''}`}
              onClick={() => handleTabChange('account')}
            >
              Account
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className={styles.content}>
        {renderView()}
      </div>
    </div>
  );
}

export default Camp;

