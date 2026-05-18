'use client';

/**
 * useStudioTraits — wallet-scoped react-query bindings for
 * `/api/studio/traits`. Standalone trait CRUD; mirrors `useStudioProjects`.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import type {
  CreateStudioTraitInput,
  StudioTrait,
  StudioTraitStatus,
  TraitType,
  UpdateStudioTraitInput,
} from '@/app/lib/studio/types';

const BASE = '/api/studio/traits';

function traitsKey(
  wallet: string | undefined,
  filters?: { status?: StudioTraitStatus; traitType?: TraitType; projectId?: string | null },
) {
  return [
    'studio',
    'traits',
    wallet ?? null,
    filters?.status ?? 'all',
    filters?.traitType ?? 'all',
    filters?.projectId ?? 'all',
  ] as const;
}
function traitKey(wallet: string | undefined, id: string | null) {
  return ['studio', 'trait', wallet ?? null, id ?? null] as const;
}

async function http<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export function useStudioTraits(filters?: {
  status?: StudioTraitStatus;
  traitType?: TraitType;
  projectId?: string | null;
}) {
  const { address } = useAccount();
  const wallet = address?.toLowerCase();
  return useQuery({
    queryKey: traitsKey(wallet, filters),
    enabled: Boolean(wallet),
    queryFn: async () => {
      const params = new URLSearchParams({ wallet: wallet! });
      if (filters?.status) params.set('status', filters.status);
      if (filters?.traitType) params.set('traitType', filters.traitType);
      if (filters?.projectId) params.set('projectId', filters.projectId);
      const data = await http<{ traits: StudioTrait[] }>(
        `${BASE}?${params.toString()}`,
      );
      return data.traits;
    },
    staleTime: 30_000,
  });
}

export function useStudioTrait(id: string | null) {
  const { address } = useAccount();
  const wallet = address?.toLowerCase();
  return useQuery({
    queryKey: traitKey(wallet, id),
    enabled: Boolean(wallet && id),
    queryFn: async () => {
      const params = new URLSearchParams({ wallet: wallet! });
      const data = await http<{ trait: StudioTrait }>(
        `${BASE}/${id}?${params.toString()}`,
      );
      return data.trait;
    },
    staleTime: 30_000,
  });
}

export function useCreateStudioTrait() {
  const qc = useQueryClient();
  const { address } = useAccount();
  const wallet = address?.toLowerCase();
  return useMutation({
    mutationFn: async (input: CreateStudioTraitInput) => {
      if (!wallet) throw new Error('Wallet not connected');
      const data = await http<{ trait: StudioTrait }>(BASE, {
        method: 'POST',
        body: JSON.stringify({ wallet, ...input }),
      });
      return data.trait;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['studio', 'traits', wallet ?? null] });
    },
  });
}

export function useUpdateStudioTrait() {
  const qc = useQueryClient();
  const { address } = useAccount();
  const wallet = address?.toLowerCase();
  return useMutation({
    mutationFn: async (args: { id: string; input: UpdateStudioTraitInput }) => {
      if (!wallet) throw new Error('Wallet not connected');
      const data = await http<{ trait: StudioTrait }>(`${BASE}/${args.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ wallet, ...args.input }),
      });
      return data.trait;
    },
    onSuccess: (trait) => {
      void qc.invalidateQueries({ queryKey: ['studio', 'traits', wallet ?? null] });
      qc.setQueryData(traitKey(wallet, trait.id), trait);
    },
  });
}

export function useDeleteStudioTrait() {
  const qc = useQueryClient();
  const { address } = useAccount();
  const wallet = address?.toLowerCase();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!wallet) throw new Error('Wallet not connected');
      const params = new URLSearchParams({ wallet });
      await http(`${BASE}/${id}?${params.toString()}`, { method: 'DELETE' });
      return id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['studio', 'traits', wallet ?? null] });
    },
  });
}
