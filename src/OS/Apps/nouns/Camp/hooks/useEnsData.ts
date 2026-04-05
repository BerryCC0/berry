/**
 * Re-export shared ENS hooks for backward compatibility.
 * The canonical implementation now lives in src/OS/hooks/useEnsData.ts.
 */
export {
  useEnsDataBatch,
  useEnsName,
  useEnsAvatar,
  useEnsData,
  getEnsFromMap,
} from '@/OS/hooks/useEnsData';
export type { EnsData, EnsMap } from '@/OS/hooks/useEnsData';
