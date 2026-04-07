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

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useTranslation } from '@/OS/lib/i18n';
import { useToolbar } from '@/OS/Shell/Window/ToolbarContext';
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

/** Camp logo — Nouns-style tri-color symbol */
function LogoSymbol(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" {...props}>
      <path
        d="M12.3334 9.77734H14.1111V8H21.2222V9.77778H19.4445V13.3334L17.6667 13.333V16.8891L15.8889 16.8887V20.4438L14.1112 20.4443V24H7V20.4443L8.77783 20.4438V16.8887H10.5555V13.333L12.3334 13.3334V9.77734Z"
        fill="#FE630C"
      />
      <path
        d="M21.1112 8H22.8889L22.889 9.77734H24.6667V11.5551V13.333H26.4445V15.1108V16.8891L28.2223 16.8887L28.2222 20.4443H30V23.9995H14V20.4443L15.7778 20.4438V16.8887H17.5557V15.1108V13.333H19.3334V11.5551V9.77734H21.1111L21.1112 8Z"
        fill="#FFC110"
      />
      <path
        d="M12.6666 9.77778H14.4444V8H9.11108V9.77734H7.33325V11.5551V13.333H5.55554V15.1108V16.8887H3.77771V20.4438L2 20.4443V23.9995H5.55551H7.33329L7.33322 20.4438H9.111L9.11105 16.8891H10.8888V15.1108L10.8888 13.333L12.6665 13.3334V11.5551L12.6666 9.77778Z"
        fill="#146636"
      />
    </svg>
  );
}

/**
 * Props bundle passed to every Camp view so they can render
 * their own toolbar content. Keeps individual view prop lists lean.
 */
export interface CampToolbarContext {
  /** Camp.module.css classes — toolbar elements use these */
  styles: Record<string, string>;
  /** Navigate within Camp */
  navigate: (pathOrRoute: string | CampRoute) => void;
  /** Go back in history */
  goBack: () => void;
  /** Open the command palette */
  openSearch: () => void;
  /** Whether a wallet is connected */
  isConnected: boolean;
  /** The Camp logo component for the leading slot */
  Logo: React.ReactNode;
  /** Ref to attach to the search bar button — used to anchor the CommandPalette */
  searchAnchorRef: React.RefObject<HTMLButtonElement | null>;
  /** Whether the command palette is open (search bar becomes active input) */
  isSearchOpen: boolean;
  /** Current search query (driven by the toolbar search input) */
  searchQuery: string;
  /** Update the search query from the toolbar input */
  onSearchChange: (query: string) => void;
}

interface CampInitialState {
  path?: string;
}

type TabId = 'activity' | 'proposals' | 'candidates' | 'voters' | 'account' | 'create';
type DigestTabId = 'digest' | 'proposals' | 'candidates' | 'voters';

export function Camp({ windowId, initialState, onStateChange }: AppComponentProps) {
  const { t } = useTranslation();
  const { isModern } = useToolbar();

  const campState = initialState as CampInitialState | undefined;
  const { isConnected } = useAccount();

  const [route, setRoute] = useState<CampRoute>(() => parseRoute(campState?.path));
  const [history, setHistory] = useState<CampRoute[]>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [digestTab, setDigestTab] = useState<DigestTabId>('digest');
  const searchAnchorRef = useRef<HTMLButtonElement | null>(null);

  // Reset query when palette closes
  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
    setSearchQuery('');
  }, []);

  useEffect(() => {
    if (campState?.path !== undefined) {
      const newRoute = parseRoute(campState.path);
      setRoute(newRoute);
    }
  }, [campState?.path]);

  const navigate = useCallback((pathOrRoute: string | CampRoute) => {
    const newRoute = typeof pathOrRoute === 'string'
      ? parseRoute(pathOrRoute)
      : pathOrRoute;
    setHistory(prev => [...prev, route]);
    setRoute(newRoute);
    onStateChange?.({ path: routeToPath(newRoute) });
  }, [route, onStateChange]);

  const goBack = useCallback(() => {
    if (history.length > 0) {
      const prevRoute = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setRoute(prevRoute);
      onStateChange?.({ path: routeToPath(prevRoute) });
    } else {
      setRoute({ view: 'activity' });
      onStateChange?.({ path: '' });
    }
  }, [history, onStateChange]);

  const getCurrentTab = (): TabId => {
    switch (route.view) {
      case 'activity': return 'activity';
      case 'proposals': case 'proposal': return 'proposals';
      case 'candidates': case 'candidate': case 'edit-candidate': return 'candidates';
      case 'voters': case 'voter': case 'vote': return 'voters';
      case 'account': return 'account';
      case 'create': return 'create';
      default: return 'activity';
    }
  };

  const currentTab = getCurrentTab();

  const handleTabChange = (tab: TabId) => {
    const viewMap: Record<TabId, CampRoute> = {
      activity: { view: 'activity' },
      proposals: { view: 'proposals' },
      candidates: { view: 'candidates' },
      voters: { view: 'voters' },
      account: { view: 'account' },
      create: { view: 'create' },
    };
    navigate(viewMap[tab]);
    setHistory([]);
  };

  // Shared toolbar context for all views
  const toolbarCtx: CampToolbarContext = {
    styles,
    navigate,
    goBack,
    openSearch: () => setIsCommandPaletteOpen(true),
    isConnected,
    searchAnchorRef,
    isSearchOpen: isCommandPaletteOpen,
    searchQuery,
    onSearchChange: setSearchQuery,
    Logo: (
      <div
        className={styles.toolbarLogoPair}
        onClick={() => navigate({ view: 'activity' })}
        data-toolbar-interactive="true"
      >
        <LogoSymbol className={styles.toolbarLogo} />
        <span className={styles.toolbarLogoX}>×</span>
        <img src="/icons/berry.svg" alt="" className={styles.toolbarLogoBerry} />
      </div>
    ),
  };

  const renderView = () => {
    switch (route.view) {
      case 'activity':
        return (
          <ActivityView
            onNavigate={navigate}
            digestTab={digestTab}
            onDigestTabChange={setDigestTab}
            toolbar={toolbarCtx}
          />
        );

      case 'proposals':
        return <ProposalListView onNavigate={navigate} onBack={goBack} toolbar={toolbarCtx} />;

      case 'proposal':
        return (
          <ProposalDetailView
            proposalId={route.id}
            onNavigate={navigate}
            onBack={goBack}
            toolbar={toolbarCtx}
          />
        );

      case 'candidates':
        return <CandidateListView onNavigate={navigate} onBack={goBack} toolbar={toolbarCtx} />;

      case 'candidate':
        return (
          <CandidateDetailView
            proposer={route.proposer}
            slug={route.slug}
            onNavigate={navigate}
            onBack={goBack}
            toolbar={toolbarCtx}
          />
        );

      case 'voters':
        return <VoterListView onNavigate={navigate} onBack={goBack} toolbar={toolbarCtx} />;

      case 'voter':
        return (
          <VoterDetailView
            address={route.address}
            onNavigate={navigate}
            onBack={goBack}
            toolbar={toolbarCtx}
          />
        );

      case 'account':
        return <AccountView onNavigate={navigate} onBack={goBack} toolbar={toolbarCtx} />;

      case 'create':
        return (
          <CreateProposalView
            onNavigate={navigate}
            onBack={goBack}
            initialDraftSlug={route.draftSlug}
            toolbar={toolbarCtx}
          />
        );

      case 'edit-candidate':
        return (
          <CreateProposalView
            onNavigate={navigate}
            onBack={goBack}
            editCandidateProposer={route.proposer}
            editCandidateSlug={route.slug}
            toolbar={toolbarCtx}
          />
        );

      case 'edit-proposal':
        return (
          <CreateProposalView
            onNavigate={navigate}
            onBack={goBack}
            editProposalId={route.proposalId}
            toolbar={toolbarCtx}
          />
        );

      default:
        return <ActivityView onNavigate={navigate} toolbar={toolbarCtx} />;
    }
  };

  return (
    <div className={styles.camp}>
      {/* ─── Legacy header (classic eras: Platinum → Flat) ─── */}
      {!isModern && (
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <img
              src="/icons/camp.svg"
              alt="Camp"
              className={styles.logo}
              onClick={() => navigate({ view: 'activity' })}
            />
            <button
              className={styles.searchButton}
              onClick={() => setIsCommandPaletteOpen(true)}
            >
              <span className={styles.searchPlaceholder}>Search...</span>
            </button>
          </div>
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
      )}

      {/* Content area */}
      <div className={styles.content}>
        {renderView()}
      </div>

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        onNavigate={navigate}
        anchorRef={searchAnchorRef}
        externalQuery={searchQuery}
        onExternalQueryChange={setSearchQuery}
        isModern={isModern}
      />
    </div>
  );
}

export default Camp;
