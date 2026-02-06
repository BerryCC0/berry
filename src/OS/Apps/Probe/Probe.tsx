"use client";

/**
 * Probe App
 * Nouns explorer — browse all Nouns with trait filtering and detail views
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { AppComponentProps } from "@/OS/types/app";
import type { TraitType } from "@/app/lib/nouns/utils/trait-name-utils";
import { useCurrentAuction } from "@/app/lib/nouns/hooks";
import { useTraitOptions } from "./hooks/useTraitOptions";
import { useProbeAddresses } from "./hooks/useProbeAddresses";
import { useProbeNouns, type ProbeFilters, type ProbeSort } from "./hooks/useProbeNouns";
import { nounContainsColor } from "./utils/paletteColors";
import { FilterBar } from "./components/FilterBar";
import { NounGrid } from "./components/NounGrid";
import { NounDetail } from "./components/NounDetail";
import styles from "./Probe.module.css";

interface ProbeInitialState {
  nounId?: number;
}

export function Probe({ initialState, onStateChange }: AppComponentProps) {
  const probeState = initialState as ProbeInitialState | undefined;

  // Navigation history: tracks the user's actual clicks (null = grid, number = noun detail)
  const initialEntry = probeState?.nounId ?? null;
  const [history, setHistory] = useState<(number | null)[]>([initialEntry]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Derived: current view from history
  const selectedNounId = history[historyIndex] ?? null;

  // Keep a stable ref to onStateChange to avoid infinite re-render loops
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  // Sync URL when selected noun changes
  useEffect(() => {
    if (selectedNounId !== null) {
      onStateChangeRef.current?.({ nounId: selectedNounId });
    } else {
      onStateChangeRef.current?.({});
    }
  }, [selectedNounId]);

  // Handle deep link changes after initial mount
  useEffect(() => {
    if (probeState?.nounId !== undefined && probeState.nounId !== selectedNounId) {
      // Push deep link as a new history entry
      setHistory(prev => [...prev.slice(0, historyIndex + 1), probeState.nounId!]);
      setHistoryIndex(prev => prev + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probeState?.nounId]);

  // Navigate: push a new entry, truncating any forward history
  const navigateTo = useCallback((entry: number | null) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), entry]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
    }
  }, [historyIndex]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
    }
  }, [historyIndex, history.length]);

  // Filter & sort state
  const [filters, setFilters] = useState<ProbeFilters>({});
  const [sort, setSort] = useState<ProbeSort>("newest");

  // Color filter (client-side, palette index)
  const [colorIndex, setColorIndex] = useState<number | null>(null);

  // Current auction (for highlighting in grid)
  const { auction } = useCurrentAuction();
  const auctionNounId = auction && !auction.settled ? Number(auction.nounId) : null;

  // Trait options for filter dropdowns
  const traitOptions = useTraitOptions();

  // Address options for owner/settler dropdowns
  const { settlerOptions, ownerOptions } = useProbeAddresses();

  // Fetch Nouns with infinite scroll pagination
  const { nouns: rawNouns, total: rawTotal, hasMore, isLoading, isFetching, loadMore } = useProbeNouns(sort, filters);

  // Apply color filter client-side (palette colors span all trait types,
  // so we can't do this server-side with a single trait param)
  const nouns = useMemo(() => {
    if (colorIndex == null) return rawNouns;
    return rawNouns.filter((n) => nounContainsColor(n, colorIndex));
  }, [rawNouns, colorIndex]);

  const total = colorIndex != null ? nouns.length : rawTotal;

  const handleFiltersChange = useCallback((newFilters: ProbeFilters) => {
    setFilters(newFilters);
  }, []);

  const handleSortChange = useCallback((newSort: ProbeSort) => {
    setSort(newSort);
  }, []);

  const handleReset = useCallback(() => {
    setFilters({});
    setSort("newest");
    setColorIndex(null);
  }, []);

  const handleSelectNoun = useCallback((id: number) => {
    navigateTo(id);
  }, [navigateTo]);

  const handleBack = useCallback(() => {
    navigateTo(null);
  }, [navigateTo]);

  const handleFilterByTrait = useCallback(
    (type: TraitType, value: number) => {
      navigateTo(null);
      setFilters({ [type]: value });
      setSort("newest");
    },
    [navigateTo]
  );

  // Detail view
  if (selectedNounId !== null) {
    return (
      <div className={styles.container}>
        <NounDetail
          nounId={selectedNounId}
          onBack={handleBack}
          onGoBack={goBack}
          onGoForward={goForward}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onFilterByTrait={handleFilterByTrait}
        />
      </div>
    );
  }

  // Grid view
  return (
    <div className={styles.container}>
      <FilterBar
        filters={filters}
        sort={sort}
        traitOptions={traitOptions}
        total={total}
        colorIndex={colorIndex}
        ownerOptions={ownerOptions}
        settlerOptions={settlerOptions}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onGoBack={goBack}
        onGoForward={goForward}
        onColorChange={setColorIndex}
        onFiltersChange={handleFiltersChange}
        onSortChange={handleSortChange}
        onReset={handleReset}
      />
      <NounGrid
        nouns={nouns}
        total={total}
        isLoading={isLoading}
        isFetching={isFetching}
        hasMore={hasMore}
        auctionNounId={auctionNounId}
        onLoadMore={loadMore}
        onSelectNoun={handleSelectNoun}
      />
    </div>
  );
}
