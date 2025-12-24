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
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { parseRoute, routeToPath, type CampRoute } from './types';
import {
  ActivityView,
  ProposalListView,
  ProposalDetailView,
  VoterListView,
  VoterDetailView,
  CandidateListView,
  CandidateDetailView,
} from './views';
import styles from './Camp.module.css';

interface CampProps {
  windowId: string;
  path?: string; // Initial path from deep link
  onPathChange?: (path: string) => void; // Callback to sync URL
}

type TabId = 'activity' | 'proposals' | 'candidates' | 'voters';

export function Camp({ windowId, path, onPathChange }: CampProps) {
  // Parse initial route from path prop
  const [route, setRoute] = useState<CampRoute>(() => parseRoute(path));
  const [history, setHistory] = useState<CampRoute[]>([]);

  // Update route when path prop changes (deep link)
  useEffect(() => {
    const newRoute = parseRoute(path);
    setRoute(newRoute);
  }, [path]);

  // Navigate to a new route
  const navigate = useCallback((pathOrRoute: string | CampRoute) => {
    const newRoute = typeof pathOrRoute === 'string' 
      ? parseRoute(pathOrRoute) 
      : pathOrRoute;
    
    // Push current route to history
    setHistory(prev => [...prev, route]);
    setRoute(newRoute);
    
    // Notify parent for URL sync
    const newPath = routeToPath(newRoute);
    onPathChange?.(newPath);
  }, [route, onPathChange]);

  // Go back in history
  const goBack = useCallback(() => {
    if (history.length > 0) {
      const prevRoute = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setRoute(prevRoute);
      onPathChange?.(routeToPath(prevRoute));
    } else {
      // Default to activity
      setRoute({ view: 'activity' });
      onPathChange?.('');
    }
  }, [history, onPathChange]);

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
      
      default:
        return <ActivityView onNavigate={navigate} />;
    }
  };

  return (
    <div className={styles.camp}>
      {/* Header with logo and tabs */}
      <div className={styles.header}>
        <img 
          src="/icons/camp.svg" 
          alt="Camp" 
          className={styles.logo}
        />
        
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

      {/* Content area */}
      <div className={styles.content}>
        {renderView()}
      </div>
    </div>
  );
}

export default Camp;

