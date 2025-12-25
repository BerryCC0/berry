'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { usePlatform } from '@/OS/lib/PlatformDetection';
import { useSpots } from './hooks';
import { SpotCard, SpotDetail, GlobeView } from './components';
import { parseRoute, routeToPath, type NounspotRoute, type SpotCategory, type Spot } from './types';
import type { AppComponentProps } from '@/OS/types/app';
import styles from './Nounspot.module.css';

interface NounspotState {
  path?: string;
}

type MobileView = 'list' | 'map';

export function Nounspot({ windowId, initialState, onStateChange }: AppComponentProps) {
  const typedInitialState = initialState as NounspotState | undefined;
  const platform = usePlatform();
  const isMobile = platform.type === 'mobile' || platform.type === 'farcaster' || platform.screenWidth < 768;
  
  const { spots, isLoading, error } = useSpots();
  const [route, setRoute] = useState<NounspotRoute>(() => {
    if (typedInitialState?.path) {
      return parseRoute(typedInitialState.path);
    }
    return { view: 'map', category: 'All' };
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SpotCategory>('All');
  const [history, setHistory] = useState<NounspotRoute[]>([]);
  const [mobileView, setMobileView] = useState<MobileView>('list');

  // Sync with initialState changes
  useEffect(() => {
    if (typedInitialState?.path) {
      const newRoute = parseRoute(typedInitialState.path);
      if (routeToPath(newRoute) !== routeToPath(route)) {
        setRoute(newRoute);
      }
    }
  }, [typedInitialState?.path, route]);

  // Navigation
  const navigate = useCallback((pathOrRoute: string | NounspotRoute) => {
    const newRoute = typeof pathOrRoute === 'string'
      ? parseRoute(pathOrRoute)
      : pathOrRoute;

    setHistory(prev => [...prev, route]);
    setRoute(newRoute);

    const newPath = routeToPath(newRoute);
    onStateChange?.({ path: newPath });
  }, [route, onStateChange]);

  const goBack = useCallback(() => {
    if (history.length > 0) {
      const prevRoute = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setRoute(prevRoute);
      
      const newPath = routeToPath(prevRoute);
      onStateChange?.({ path: newPath });
    } else if (route.view === 'spot') {
      const mapRoute: NounspotRoute = { view: 'map', category: categoryFilter };
      setRoute(mapRoute);
      onStateChange?.({ path: '' });
    }
  }, [history, route.view, categoryFilter, onStateChange]);

  // Filter spots
  const filteredSpots = useMemo(() => {
    return spots.filter(spot => {
      // Category filter
      if (categoryFilter !== 'All' && spot.category !== categoryFilter) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          spot.name.toLowerCase().includes(query) ||
          spot.description?.toLowerCase().includes(query) ||
          spot.address.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [spots, categoryFilter, searchQuery]);

  // Selected spot
  const selectedSpot = useMemo(() => {
    if (route.view === 'spot' && route.spotId) {
      return spots.find(s => s.id === route.spotId) ?? null;
    }
    return null;
  }, [spots, route]);

  // Handle spot click
  const handleSpotClick = useCallback((spot: Spot) => {
    navigate({ view: 'spot', spotId: spot.id });
  }, [navigate]);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Failed to load spots</h2>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  // Detail view
  if (route.view === 'spot' && selectedSpot) {
    return (
      <div className={styles.container}>
        <div className={styles.detailPane}>
          <SpotDetail spot={selectedSpot} onBack={goBack} />
        </div>
        {/* Only show globe on desktop in detail view */}
        {!isMobile && (
          <div className={styles.globePane}>
            <GlobeView 
              spots={spots} 
              selectedSpotId={selectedSpot.id}
              onSpotClick={handleSpotClick}
            />
          </div>
        )}
      </div>
    );
  }

  // Main view
  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div className={`${styles.sidebar} ${!isMobile || mobileView === 'list' ? styles.showSidebar : ''}`}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.logo}>⌐◨-◨</span>
            nounspot
          </h1>
        </div>

        {/* Search */}
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search spots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Category Filter */}
        <div className={styles.filters}>
          {(['All', 'Places', 'Things', 'People'] as SpotCategory[]).map(cat => (
            <button
              key={cat}
              className={`${styles.filterButton} ${categoryFilter === cat ? styles.filterActive : ''}`}
              onClick={() => setCategoryFilter(cat)}
              data-category={cat}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Spots List */}
        <div className={styles.spotsList}>
          {isLoading ? (
            <div className={styles.loading}>Loading spots...</div>
          ) : filteredSpots.length === 0 ? (
            <div className={styles.empty}>No spots found</div>
          ) : (
            filteredSpots.map(spot => (
              <SpotCard
                key={spot.id}
                spot={spot}
                isSelected={route.spotId === spot.id}
                onClick={() => handleSpotClick(spot)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <a 
            href="https://nounspot.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            nounspot.com
          </a>
          <span className={styles.footerCount}>
            {spots.length} spots worldwide
          </span>
        </div>
      </div>

      {/* Globe */}
      <div className={`${styles.globePane} ${!isMobile || mobileView === 'map' ? styles.showGlobe : ''}`}>
        <GlobeView 
          spots={filteredSpots} 
          selectedSpotId={null}
          onSpotClick={handleSpotClick}
        />
      </div>

      {/* Mobile View Toggle */}
      {isMobile && (
        <div className={styles.mobileViewToggle}>
          <button
            className={`${styles.viewToggleButton} ${mobileView === 'list' ? styles.active : ''}`}
            onClick={() => setMobileView('list')}
          >
            📋 List
          </button>
          <button
            className={`${styles.viewToggleButton} ${mobileView === 'map' ? styles.active : ''}`}
            onClick={() => setMobileView('map')}
          >
            🌍 Globe
          </button>
        </div>
      )}
    </div>
  );
}

