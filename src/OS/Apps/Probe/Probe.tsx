"use client";

/**
 * Probe App
 * Nouns explorer — browse all Nouns with trait filtering and detail views
 */

import { useState, useCallback, useMemo } from "react";
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

export function Probe({}: AppComponentProps) {
  // View state: null = grid, number = detail view for that Noun ID
  const [selectedNounId, setSelectedNounId] = useState<number | null>(null);

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
    setSelectedNounId(id);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedNounId(null);
  }, []);

  const handleNavigateNoun = useCallback((id: number) => {
    const maxId = auctionNounId ?? Infinity;
    if (id >= 0 && id <= maxId) {
      setSelectedNounId(id);
    }
  }, [auctionNounId]);

  const handleFilterByTrait = useCallback(
    (type: TraitType, value: number) => {
      setSelectedNounId(null);
      setFilters({ [type]: value });
      setSort("newest");
    },
    []
  );

  // Detail view
  if (selectedNounId !== null) {
    return (
      <div className={styles.container}>
        <NounDetail
          nounId={selectedNounId}
          onBack={handleBack}
          onNavigate={handleNavigateNoun}
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
