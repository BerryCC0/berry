/**
 * Type definitions and interfaces for Action Templates
 */

import { Address } from 'viem';

export type ActionTemplateType =
  | 'treasury-eth'
  | 'treasury-usdc'
  | 'treasury-weth'
  | 'treasury-erc20-custom'
  | 'swap-buy-eth'
  | 'swap-sell-eth'
  | 'noun-transfer'
  | 'noun-swap'
  | 'noun-delegate'
  | 'auction-bid'
  | 'payment-stream'
  | 'payment-once'
  | 'admin-voting-delay'
  | 'admin-voting-period'
  | 'admin-proposal-threshold'
  | 'admin-last-minute-window'
  | 'admin-objection-period'
  | 'admin-updatable-period'
  | 'admin-min-quorum'
  | 'admin-max-quorum'
  | 'admin-quorum-coefficient'
  | 'admin-dynamic-quorum'
  | 'admin-fork-period'
  | 'admin-fork-threshold'
  | 'admin-fork-deployer'
  | 'admin-fork-escrow'
  | 'admin-fork-tokens'
  | 'admin-pending-admin'
  | 'admin-timelock-delay'
  | 'admin-timelock-admin'
  | 'meta-propose'
  | 'custom';

export interface ProposalAction {
  target: string;
  value: string;
  signature: string;
  calldata: string;
  // Multi-action metadata
  isPartOfMultiAction?: boolean;
  multiActionGroupId?: string;
  multiActionIndex?: number;
}

export interface ActionTemplate {
  id: ActionTemplateType;
  category: 'treasury' | 'swaps' | 'nouns' | 'payments' | 'admin' | 'meta' | 'custom';
  name: string;
  description: string;
  isMultiAction: boolean;
  fields: ActionField[];
}

export interface ActionField {
  name: string;
  label: string;
  type: 'address' | 'amount' | 'number' | 'select' | 'date' | 'text' | 'token-select';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  validation?: {
    min?: number;
    max?: number;
    decimals?: number;
  };
  helpText?: string;
}

export interface TokenInfo {
  symbol: string;
  address: Address;
  decimals: number;
  balance?: bigint;
  name?: string;
}

export interface TemplateFieldValues {
  [key: string]: string | undefined;
}

export interface ActionTemplateState {
  templateId: ActionTemplateType | 'custom' | '';
  fieldValues: TemplateFieldValues;
  generatedActions: ProposalAction[];
}
