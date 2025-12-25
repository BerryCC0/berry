/**
 * Camp Utils Types
 * Shared types for proposal creation
 */

import type { ActionTemplateState, ProposalAction } from './actionTemplates';

// Re-export ActionTemplateState from actionTemplates
export type { ActionTemplateState };

/**
 * Proposal Draft
 * Represents a saved proposal draft
 */
export interface ProposalDraft {
  id?: number;
  wallet_address: string;
  draft_slug: string;
  draft_title: string;
  title: string;
  description: string;
  actions: ProposalAction[];
  action_templates: ActionTemplateState[];
  proposal_type: 'standard' | 'timelock_v1' | 'candidate';
  candidate_slug?: string;
  kyc_verified: boolean;
  kyc_inquiry_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Slug generation functions are exported from ./slugGenerator

