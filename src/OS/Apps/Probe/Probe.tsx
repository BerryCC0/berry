"use client";

/**
 * Probe App
 * Nouns explorer — browse all Nouns with trait filtering and detail views
 */

import { useState, useCallback } from "react";
import type { AppComponentProps } from "@/OS/types/app";
import type { TraitType } from "@/app/lib/nouns/utils/trait-name-utils";
import { useTraitOptions } from "./hooks/useTraitOptions";
import { useProbeNouns, type ProbeFilters, type ProbeSort } from "./hooks/useProbeNouns";
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

  // Trait options for filter dropdowns
  const traitOptions = useTraitOptions();

  // Fetch Nouns with infinite scroll pagination
  const { nouns, total, hasMore, isLoading, isFetching, loadMore } = useProbeNouns(sort, filters);

  const handleFiltersChange = useCallback((newFilters: ProbeFilters) => {
    setFilters(newFilters);
  }, []);

  const handleSortChange = useCallback((newSort: ProbeSort) => {
    setSort(newSort);
  }, []);

  const handleReset = useCallback(() => {
    setFilters({});
    setSort("newest");
  }, []);

  const handleSelectNoun = useCallback((id: number) => {
    setSelectedNounId(id);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedNounId(null);
  }, []);

  const handleNavigateNoun = useCallback((id: number) => {
    if (id >= 0) {
      setSelectedNounId(id);
    }
  }, []);

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
        onLoadMore={loadMore}
        onSelectNoun={handleSelectNoun}
      />
    </div>
  );
}
