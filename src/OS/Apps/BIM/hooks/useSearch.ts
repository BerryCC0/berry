/**
 * useSearch — Message search across conversations
 */

"use client";

import { useState, useCallback } from "react";
import { useBimStore } from "../store/bimStore";
import type { BimMessage } from "../types";

export interface SearchResult {
  message: BimMessage;
  conversationId: string;
}

export function useSearch() {
  const { messages } = useBimStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const lowerQuery = searchQuery.toLowerCase();
    const found: SearchResult[] = [];

    for (const [conversationId, msgs] of Object.entries(messages)) {
      for (const msg of msgs) {
        if (
          msg.contentType === "text" &&
          msg.content.toLowerCase().includes(lowerQuery)
        ) {
          found.push({ message: msg, conversationId });
        }
      }
    }

    // Sort by most recent first
    found.sort((a, b) => b.message.sentAt - a.message.sentAt);
    setResults(found.slice(0, 50));
    setIsSearching(false);
  }, [messages]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
  }, []);

  return {
    query,
    results,
    isSearching,
    search,
    clearSearch,
  };
}
