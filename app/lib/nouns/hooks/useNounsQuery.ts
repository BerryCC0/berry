/**
 * Goldsky Subgraph Query Hook
 * Typed GraphQL query hook for Nouns subgraph data
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { GOLDSKY_ENDPOINT } from '../constants';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * Execute a GraphQL query against the Nouns Goldsky subgraph
 */
export async function queryNouns<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Goldsky query failed: ${response.statusText}`);
  }

  const json: GraphQLResponse<T> = await response.json();

  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0].message);
  }

  if (!json.data) {
    throw new Error('No data returned from Goldsky');
  }

  return json.data;
}

/**
 * React Query hook for Nouns subgraph queries
 */
export function useNounsQuery<T>(
  queryKey: string[],
  query: string,
  variables?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, Error>({
    queryKey: ['nouns', ...queryKey],
    queryFn: () => queryNouns<T>(query, variables),
    ...options,
  });
}

