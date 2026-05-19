/**
 * Type definitions and interfaces for Action Templates
 */

import { Address } from 'viem';

export type ActionTemplateType =
  | 'treasury-transfer'
  | 'swap-buy-eth'
  | 'tokenbuyer-refill-eth'
  | 'payer-repay-debt'
  | 'noun-transfer'
  | 'noun-swap'
  | 'noun-delegate'
  | 'treasury-delegate'
  | 'auction-bid'
  | 'payment-stream'
  | 'stream-cancel'
  | 'stream-redirect'
  | 'stream-restream'
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
  | 'admin-tokenbuyer-baseline'
  | 'admin-tokenbuyer-discount'
  | 'admin-tokenbuyer-pause'
  | 'admin-tokenbuyer-unpause'
  | 'admin-tokenbuyer-withdraw-eth'
  | 'admin-tokenbuyer-admin'
  | 'admin-tokenbuyer-price-feed'
  | 'admin-tokenbuyer-payer'
  | 'admin-payer-withdraw-usdc'
  | 'admin-auction-reserve-price'
  | 'admin-auction-time-buffer'
  | 'admin-auction-min-bid-increment'
  | 'admin-auction-pause'
  | 'admin-auction-unpause'
  | 'admin-auction-sanctions-oracle'
  | 'admin-rewards-auction-params'
  | 'admin-rewards-proposal-params'
  | 'admin-rewards-client-approval'
  | 'admin-rewards-enable-auction'
  | 'admin-rewards-disable-auction'
  | 'admin-rewards-enable-proposal'
  | 'admin-rewards-disable-proposal'
  | 'admin-rewards-admin'
  | 'admin-rewards-descriptor'
  | 'admin-rewards-eth-token'
  | 'admin-data-create-cost'
  | 'admin-data-update-cost'
  | 'admin-data-fee-recipient'
  | 'admin-data-withdraw-eth'
  | 'admin-data-duna-admin'
  | 'admin-token-minter'
  | 'admin-token-descriptor'
  | 'admin-token-seeder'
  | 'admin-token-nounders-dao'
  | 'admin-token-contract-uri-hash'
  | 'admin-fork-escrow-close'
  | 'admin-fork-escrow-withdraw-tokens'
  | 'admin-fork-escrow-return-tokens'
  | 'admin-rewards-withdraw-token'
  | 'admin-rewards-transfer-ownership'
  | 'admin-tokenbuyer-transfer-ownership'
  | 'admin-tokenbuyer-max-baseline'
  | 'admin-tokenbuyer-min-baseline'
  | 'admin-tokenbuyer-max-discount'
  | 'admin-tokenbuyer-min-discount'
  | 'admin-payer-transfer-ownership'
  | 'descriptor-lock-parts'
  | 'descriptor-toggle-data-uri'
  | 'descriptor-set-base-uri'
  | 'descriptor-set-art'
  | 'descriptor-set-renderer'
  | 'descriptor-set-art-descriptor'
  | 'descriptor-set-art-inflator'
  | 'descriptor-transfer-ownership'
  | 'descriptor-add-background'
  | 'descriptor-add-many-backgrounds'
  | 'descriptor-add-trait-head'
  | 'descriptor-add-trait-body'
  | 'descriptor-add-trait-accessory'
  | 'descriptor-add-trait-glasses'
  | 'erc20-approve'
  | 'erc20-revoke-approval'
  | 'swap-uniswap-v3'
  | 'swap-cowswap'
  | 'lst-wsteth-unwrap'
  | 'lst-lido-request-withdrawal'
  | 'lst-lido-claim-withdrawal'
  | 'lst-meth-unstake-request'
  | 'lst-meth-unstake-claim'
  | 'opensea-listing'
  | 'marketplace-fulfill-seaport'
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
  category:
    | 'payments'
    | 'swaps'
    | 'nouns'
    | 'streams'
    | 'delegation'
    | 'artwork'
    | 'admin'
    | 'meta'
    | 'custom'
    | 'erc20'
    | 'dex'
    | 'staking'
    | 'nft';
  name: string;
  description: string;
  isMultiAction: boolean;
  fields: ActionField[];
}

export interface ActionField {
  name: string;
  label: string;
  type: 'address' | 'amount' | 'number' | 'select' | 'date' | 'text' | 'token-select' | 'stream-select' | 'treasury-token-select' | 'treasury-votes-token-select' | 'predicted-stream-address' | 'artwork-trait';
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
