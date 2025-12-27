'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import type { Spot } from '../types';
import { getCategoryColor } from '../types';
import styles from './GlobeView.module.css';

interface GlobeViewProps {
  spots: Spot[];
  selectedSpotId: string | null;
  onSpotClick: (spot: Spot) => void;
}

// Noggles SVG as a marker icon
function createMarkerSvg(color: string): string {
  return `
    <svg width="32" height="20" viewBox="0 0 32 20" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="14" height="20" rx="3" fill="${color}"/>
      <rect x="18" y="0" width="14" height="20" rx="3" fill="${color}"/>
      <rect x="3" y="4" width="8" height="12" rx="2" fill="#1a1a1a"/>
      <rect x="21" y="4" width="8" height="12" rx="2" fill="#1a1a1a"/>
      <rect x="14" y="6" width="4" height="4" fill="${color}"/>
    </svg>
  `;
}

export function GlobeView({ spots, selectedSpotId, onSpotClick }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredSpot, setHoveredSpot] = useState<Spot | null>(null);
  const mountedRef = useRef(true);

  // Prepare marker data - memoized to prevent unnecessary re-renders
  const markerData = useMemo(() => {
    return spots.map(spot => ({
      ...spot,
      lat: spot.locationLat,
      lng: spot.locationLng,
      size: spot.id === selectedSpotId ? 1.5 : 1,
      color: getCategoryColor(spot.category),
    }));
  }, [spots, selectedSpotId]);

  // Store callbacks in refs to avoid stale closures
  const onSpotClickRef = useRef(onSpotClick);
  onSpotClickRef.current = onSpotClick;

  // Initialize globe only once
  useEffect(() => {
    mountedRef.current = true;
    
    if (!containerRef.current) return;

    let globe: any = null;
    const container = containerRef.current;

    // Dynamically import globe.gl (it's not SSR-compatible)
    import('globe.gl').then((GlobeModule) => {
      if (!mountedRef.current || !container) return;

      const GlobeConstructor = GlobeModule.default;
      globe = new GlobeConstructor(container)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .width(container.clientWidth)
        .height(container.clientHeight)
        .backgroundColor('rgba(0,0,0,0)')
        .atmosphereColor('#3a7bd5')
        .atmosphereAltitude(0.25);

      // Auto-rotate
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.5;
      globe.controls().enableZoom = true;
      globe.controls().minDistance = 150;
      globe.controls().maxDistance = 500;

      // Initial camera position - slightly elevated to account for UI elements at bottom
      globe.pointOfView({ lat: 15, lng: 0, altitude: 2.5 }, 0);

      globeInstanceRef.current = globe;
      setIsLoaded(true);
    }).catch(err => {
      console.error('Failed to load globe.gl:', err);
    });

    return () => {
      mountedRef.current = false;
      if (globe) {
        // Clean up properly
        try {
          globe.controls().dispose?.();
          globe.renderer().dispose?.();
          globe.scene().clear?.();
        } catch (e) {
          // Ignore cleanup errors
        }
        globeInstanceRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Update markers when data changes
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe || !isLoaded) return;

    // Use HTML markers for Noggles
    globe
      .htmlElementsData(markerData)
      .htmlElement((d: any) => {
        const el = document.createElement('div');
        el.innerHTML = createMarkerSvg(d.color);
        el.style.cursor = 'pointer';
        el.style.pointerEvents = 'auto';
        el.style.transition = 'transform 0.2s ease, opacity 0.3s ease';
        el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))';
        
        const isSelected = d.id === selectedSpotId;
        const hasSelection = selectedSpotId !== null;
        
        if (isSelected) {
          el.style.transform = 'scale(1.5)';
          el.style.zIndex = '100';
          el.style.opacity = '1';
        } else if (hasSelection) {
          // Dim non-selected markers when something is selected
          el.style.opacity = '0.25';
        }
        
        el.onclick = () => onSpotClickRef.current(d);
        el.onmouseenter = () => {
          el.style.transform = isSelected ? 'scale(1.8)' : 'scale(1.3)';
          el.style.opacity = '1';
          setHoveredSpot(d);
        };
        el.onmouseleave = () => {
          el.style.transform = isSelected ? 'scale(1.5)' : 'scale(1)';
          el.style.opacity = isSelected ? '1' : (hasSelection ? '0.25' : '1');
          setHoveredSpot(null);
        };
        
        return el;
      })
      .htmlLat((d: any) => d.lat)
      .htmlLng((d: any) => d.lng)
      .htmlAltitude(0.01);
  }, [markerData, isLoaded, selectedSpotId]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const globe = globeInstanceRef.current;
      if (globe && containerRef.current) {
        globe
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Focus on selected spot and stop rotation
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;
    
    // Stop rotation when a spot is selected, resume when deselected
    globe.controls().autoRotate = !selectedSpotId;
    
    if (selectedSpotId) {
      const spot = spots.find(s => s.id === selectedSpotId);
      if (spot) {
        globe.pointOfView(
          { lat: spot.locationLat, lng: spot.locationLng, altitude: 1.5 },
          1000 // animation duration
        );
      }
    }
  }, [selectedSpotId, spots]);

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.container} />
      
      {!isLoaded && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingText}>Loading globe...</div>
        </div>
      )}

      {/* Tooltip */}
      {hoveredSpot && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipName}>{hoveredSpot.name}</div>
          <div className={styles.tooltipCategory} style={{ color: getCategoryColor(hoveredSpot.category) }}>
            {hoveredSpot.category}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className={styles.stats}>
        <span className={styles.statItem}>
          <span className={styles.statDot} style={{ background: '#e4497a' }} />
          {spots.filter(s => s.category === 'Places').length} Places
        </span>
        <span className={styles.statItem}>
          <span className={styles.statDot} style={{ background: '#00b4d8' }} />
          {spots.filter(s => s.category === 'Things').length} Things
        </span>
        <span className={styles.statItem}>
          <span className={styles.statDot} style={{ background: '#9d4edd' }} />
          {spots.filter(s => s.category === 'People').length} People
        </span>
      </div>
    </div>
  );
}
