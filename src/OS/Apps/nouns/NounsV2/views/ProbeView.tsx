/**
 * V2 Probe — explore every V2 noun with trait / owner / winner / settler
 * filters and a detail view. Mirrors the V1 Probe app, adapted to V2's data
 * path (on-chain art, index-based trait labels, small collection).
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useEnsDataBatch } from '@/OS/hooks/useEnsData';
import { useV2CurrentAuction } from '../hooks/useV2CurrentAuction';
import { useV2ProbeNouns } from '../hooks/useV2ProbeNouns';
import { useV2NounImages } from '../hooks/useV2NounImages';
import { V2ProbeFilterBar } from '../components/V2ProbeFilterBar';
import { V2ProbeGrid } from '../components/V2ProbeGrid';
import { V2ProbeDetail } from '../components/V2ProbeDetail';
import {
  filterAndSortNouns,
  allProbeAddresses,
  type V2ProbeFilters,
  type V2ProbeSort,
} from '../utils/probeFilter';
import type { V2TraitType } from '../utils/traitLabels';
import styles from './ProbeView.module.css';

export function ProbeView() {
  // Grid ↔ detail navigation history (null = grid, number = noun detail).
  const [history, setHistory] = useState<(number | null)[]>([null]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const selectedNounId = history[historyIndex] ?? null;

  const navigateTo = useCallback(
    (entry: number | null) => {
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), entry]);
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;
  const goBack = useCallback(() => {
    if (historyIndex > 0) setHistoryIndex((p) => p - 1);
  }, [historyIndex]);
  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) setHistoryIndex((p) => p + 1);
  }, [historyIndex, history.length]);

  const [filters, setFilters] = useState<V2ProbeFilters>({});
  const [sort, setSort] = useState<V2ProbeSort>('newest');

  const { auction } = useV2CurrentAuction();
  const auctionNounId = auction && !auction.settled ? Number(auction.nounId) : null;

  const { data, isLoading } = useV2ProbeNouns();
  const allNouns = useMemo(() => data?.nouns ?? [], [data]);
  const nouns = useMemo(
    () => filterAndSortNouns(allNouns, filters, sort),
    [allNouns, filters, sort]
  );

  const ensAddresses = useMemo(() => allProbeAddresses(allNouns), [allNouns]);
  const { data: ensMap } = useEnsDataBatch(ensAddresses);

  // Batch-render all noun art in one multicall (keyed on the full set so it
  // stays cached while the user filters).
  const allNounIds = useMemo(() => allNouns.map((n) => n.id), [allNouns]);
  const { images } = useV2NounImages(allNounIds);

  const handleFilterByTrait = useCallback(
    (type: V2TraitType, value: number) => {
      navigateTo(null);
      const next: V2ProbeFilters = {};
      next[type] = value;
      setFilters(next);
      setSort('newest');
    },
    [navigateTo]
  );

  const handleReset = useCallback(() => {
    setFilters({});
    setSort('newest');
  }, []);

  if (selectedNounId !== null) {
    return (
      <div className={styles.view}>
        <V2ProbeDetail
          nounId={selectedNounId}
          onBack={() => navigateTo(null)}
          onGoBack={goBack}
          onGoForward={goForward}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onFilterByTrait={handleFilterByTrait}
        />
      </div>
    );
  }

  return (
    <div className={styles.view}>
      <V2ProbeFilterBar
        allNouns={allNouns}
        filters={filters}
        sort={sort}
        total={nouns.length}
        ensMap={ensMap ?? {}}
        onFiltersChange={setFilters}
        onSortChange={setSort}
        onReset={handleReset}
      />
      <V2ProbeGrid
        nouns={nouns}
        images={images}
        isLoading={isLoading}
        auctionNounId={auctionNounId}
        onSelect={(id) => navigateTo(id)}
      />
    </div>
  );
}
