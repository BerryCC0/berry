'use client';

/**
 * useStudioProjects / useStudioProject — react-query bindings for the
 * `/api/studio/projects` endpoints. Wallet-scoped: when no wallet is
 * connected the queries are disabled and return an empty list.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import type {
  CreateStudioProjectInput,
  StudioProject,
  StudioProjectStatus,
  UpdateStudioProjectInput,
} from '@/app/lib/studio/types';

const BASE = '/api/studio/projects';

function projectsKey(wallet: string | undefined, status?: StudioProjectStatus) {
  return ['studio', 'projects', wallet ?? null, status ?? 'all'] as const;
}
function projectKey(wallet: string | undefined, id: string | null) {
  return ['studio', 'project', wallet ?? null, id ?? null] as const;
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

export function useStudioProjects(opts?: { status?: StudioProjectStatus }) {
  const { address } = useAccount();
  const wallet = address?.toLowerCase();
  return useQuery({
    queryKey: projectsKey(wallet, opts?.status),
    enabled: Boolean(wallet),
    queryFn: async () => {
      const params = new URLSearchParams({ wallet: wallet! });
      if (opts?.status) params.set('status', opts.status);
      const data = await http<{ projects: StudioProject[] }>(
        `${BASE}?${params.toString()}`,
      );
      return data.projects;
    },
    staleTime: 30_000,
  });
}

export function useStudioProject(id: string | null) {
  const { address } = useAccount();
  const wallet = address?.toLowerCase();
  return useQuery({
    queryKey: projectKey(wallet, id),
    enabled: Boolean(wallet && id),
    queryFn: async () => {
      const params = new URLSearchParams({ wallet: wallet! });
      const data = await http<{ project: StudioProject }>(
        `${BASE}/${id}?${params.toString()}`,
      );
      return data.project;
    },
    staleTime: 30_000,
  });
}

export function useCreateStudioProject() {
  const qc = useQueryClient();
  const { address } = useAccount();
  const wallet = address?.toLowerCase();
  return useMutation({
    mutationFn: async (input: CreateStudioProjectInput) => {
      if (!wallet) throw new Error('Wallet not connected');
      const data = await http<{ project: StudioProject }>(BASE, {
        method: 'POST',
        body: JSON.stringify({ wallet, ...input }),
      });
      return data.project;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['studio', 'projects', wallet ?? null] });
    },
  });
}

export function useUpdateStudioProject() {
  const qc = useQueryClient();
  const { address } = useAccount();
  const wallet = address?.toLowerCase();
  return useMutation({
    mutationFn: async (args: { id: string; input: UpdateStudioProjectInput }) => {
      if (!wallet) throw new Error('Wallet not connected');
      const data = await http<{ project: StudioProject }>(`${BASE}/${args.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ wallet, ...args.input }),
      });
      return data.project;
    },
    onSuccess: (project) => {
      void qc.invalidateQueries({ queryKey: ['studio', 'projects', wallet ?? null] });
      qc.setQueryData(projectKey(wallet, project.id), project);
    },
  });
}

export function useDeleteStudioProject() {
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
      void qc.invalidateQueries({ queryKey: ['studio', 'projects', wallet ?? null] });
    },
  });
}

export function useDuplicateStudioProject() {
  const qc = useQueryClient();
  const { address } = useAccount();
  const wallet = address?.toLowerCase();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!wallet) throw new Error('Wallet not connected');
      const data = await http<{ project: StudioProject }>(
        `${BASE}/${id}/duplicate`,
        { method: 'POST', body: JSON.stringify({ wallet }) },
      );
      return data.project;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['studio', 'projects', wallet ?? null] });
    },
  });
}

export function useExtractStudioTrait() {
  const qc = useQueryClient();
  const { address } = useAccount();
  const wallet = address?.toLowerCase();
  return useMutation({
    mutationFn: async (args: { projectId: string; traitType: string; name?: string }) => {
      if (!wallet) throw new Error('Wallet not connected');
      const data = await http<{ trait: unknown }>(
        `${BASE}/${args.projectId}/extract-trait`,
        {
          method: 'POST',
          body: JSON.stringify({
            wallet,
            traitType: args.traitType,
            name: args.name,
          }),
        },
      );
      return data.trait;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['studio', 'traits', wallet ?? null] });
    },
  });
}
