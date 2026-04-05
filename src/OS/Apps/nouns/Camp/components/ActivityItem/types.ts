/**
 * Shared types for ActivityItem sub-components.
 * All sub-components receive these props from the orchestrator.
 */

import type { ActivityItem } from '../../types';
import type { RepostInfo, ReplyInfo } from '../../utils/repostParser';

export interface ActivityContentProps {
  item: ActivityItem;

  // ENS-resolved display values
  displayName: string;
  actorAvatar: string | null | undefined;
  toAddressEns: string | null | undefined;
  winnerEns: string | null | undefined;
  settlerEns: string | null | undefined;
  replyOriginalPosterEns: string | null | undefined;
  repostOriginalPosterEns: string | null | undefined;
  replyOriginalPosterAddress: string | undefined;
  repostOriginalPosterAddress: string | undefined;

  // Computed values
  nounId: number | undefined;
  repostInfo: RepostInfo | null;
  replyInfo: ReplyInfo | null;

  // Contract detection (noun_transfer)
  fromContractLabel: string | null;
  toContractLabel: string | null;
  isFromContract: boolean;
  isToContract: boolean;

  // Sale detection (noun_transfer)
  isSale: boolean;
  salePrice: string | null;

  // Helpers
  formatAddr: (address: string, ensName?: string | null) => string;

  // Click handlers
  onClickActor: () => void;
  onClickToAddress: () => void;
  onClickProposal: () => void;
  onClickCandidate: () => void;
  onClickAuction?: (nounId: string) => void;
  onClickVoter?: (address: string) => void;
}
