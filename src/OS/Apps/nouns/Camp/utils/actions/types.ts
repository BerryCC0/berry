/**
 * Core types for the TransactionAction registry — the unified primitive
 * that replaces the parallel templates/generator/parser/decoder ledgers.
 *
 * Each transaction type is one `TransactionActionDef`. It owns its full
 * lifecycle: encode (fields → on-chain action), decode (on-chain action →
 * fields), describe (fields → human-readable display).
 *
 * Modeled on the OSAppConfig pattern — see src/OS/Apps/OSAppConfig.ts.
 */

import type { LazyExoticComponent, FC } from 'react';
import type { ProposalAction } from '../actionTemplates/types';

// Re-export the shared on-chain action shape so action modules can import
// from one place. ProposalAction stays defined in actionTemplates/types
// until that module is fully migrated.
export type { ProposalAction };

/**
 * Domain a transaction action belongs to. Mirrors the directory layout under
 * `actions/<category>/`. Adding a new category means adding a directory AND
 * a literal here — this keeps the union exhaustive for switch checks.
 */
export type ActionCategory =
  | 'treasury'
  | 'nouns'
  | 'streams'
  | 'swaps'
  | 'staking'
  | 'octant'
  | 'marketplace'
  | 'governance-admin'
  | 'auction-admin'
  | 'rewards-admin'
  | 'tokenbuyer-admin'
  | 'descriptor'
  | 'erc20'
  | 'meta'
  | 'custom';

/**
 * Field types the default schema-driven editor knows how to render. Custom
 * editors (set via `Editor` on the action def) can use any shape they want;
 * this union is only consulted by the generic form.
 */
export type ActionFieldType =
  | 'address'
  | 'amount'
  | 'number'
  | 'select'
  | 'date'
  | 'text'
  | 'token-select'
  | 'stream-select'
  | 'treasury-token-select'
  | 'treasury-votes-token-select'
  | 'predicted-stream-address'
  | 'artwork-trait';

/**
 * One field in an action's form schema. The default editor renders these
 * top-to-bottom; custom Editors may ignore the schema entirely.
 */
export interface ActionFieldDef {
  name: string;
  label: string;
  type: ActionFieldType;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  validation?: { min?: number; max?: number; decimals?: number };
  helpText?: string;
  defaultValue?: string;
}

/**
 * Context passed to `encode()`. Today only the proposer's address is needed
 * for a few actions (e.g., noun-swap uses it as the counterparty); leave the
 * interface open so we can grow it without breaking existing actions.
 */
export interface EncodeContext {
  proposerAddress?: string;
}

/**
 * Context passed to `decode()`. Lets matchers consult cross-action knowledge:
 * which targets are streams predicted-elsewhere in the proposal, which streams
 * have a `cancel()` upstream, dynamic ERC-20 metadata fetched on-chain, etc.
 *
 * Intentionally compatible in shape with the existing `DecodingContext` in
 * transactionDecoder.ts so the registry walker can be wired in without
 * rebuilding context resolution.
 */
export interface DecodeContext {
  /** Predicted stream addresses created by `createStream(...)` calls in this proposal. */
  streamAddresses: Set<string>;
  /** Targets cancelled by a `cancel()` call earlier in this proposal. */
  cancelledStreams: Set<string>;
  /** Caller-supplied stream metadata for vested/unvested formatting. */
  streams: Map<string, StreamMeta>;
  /** Caller-supplied dynamic ERC-20 metadata for unknown tokens. */
  tokens: Map<string, TokenMeta>;
}

/**
 * Context passed to `describe()`. Same surface as DecodeContext — the
 * description usually needs to format token amounts, look up contract names,
 * etc. — so we let the action def consult the same registries the decoder did.
 */
export type DescribeContext = DecodeContext;

/**
 * Minimal ERC-20 metadata used by description formatters. Matches the shape
 * that the legacy decoder uses internally (TokenInfo); kept structurally
 * compatible to ease wiring.
 */
export interface TokenMeta {
  symbol: string;
  decimals: number;
}

/**
 * Stream metadata pulled from the indexer for cancel/recover descriptions.
 * Structurally compatible with the legacy `StreamInfo` type.
 */
export interface StreamMeta {
  streamAddress: string;
  tokenAddress: string;
  tokenAmountRaw: string;
  vestedRatio: number;
  status: 'pending' | 'streaming' | 'complete';
}

/**
 * Result of a successful `decode()` call. `consumed` is how many actions
 * (starting from the cursor) this match swallowed — 1 for single-action
 * templates, N for multi-action aggregates like `stream-restream` (4) or
 * `noun-swap` (2-3).
 */
export interface DecodeMatch<TFields> {
  values: TFields;
  consumed: number;
}

/**
 * One line of decoded display text produced by `describe()`. For multi-action
 * aggregates, `describe()` returns one of these per consumed action so the
 * existing per-action UI rendering (TransactionSummary.tsx) keeps working.
 */
export interface ActionDescription {
  title: string;
  description?: string;
  functionName: string;
  params?: Record<string, string>;
}

/**
 * Props the default schema-driven editor receives. Custom editors receive the
 * same shape; consumers control field values via `onChange`.
 */
export interface EditorProps<TFields> {
  values: TFields;
  onChange: (patch: Partial<TFields>) => void;
  errors?: Partial<Record<keyof TFields, string>>;
}

/**
 * THE primitive. One `TransactionActionDef` per transaction type. Lives in
 * `actions/<category>/<action>.ts`, registered in `actions/registry.ts`.
 *
 * Lifecycle methods are pure: they take inputs (fields, actions, context)
 * and produce outputs (actions, fields, descriptions). No I/O, no React.
 * Editors are the only React touchpoint; they're lazy-loaded.
 */
export interface TransactionActionDef<TFields = Record<string, unknown>> {
  /** Stable id — matches the legacy `ActionTemplateType` literal. */
  id: string;
  category: ActionCategory;
  /** Display name shown in the template picker. */
  name: string;
  /** Short description for the picker. */
  description: string;
  /** Whether this action emits multiple on-chain actions as one logical unit. */
  isMultiAction: boolean;
  /** Form schema — used by the default editor; ignored if `Editor` is set. */
  fields: ActionFieldDef[];

  /**
   * Turn user-entered field values into the on-chain actions a proposal would
   * execute. Aggregates return >1 action with linked `multiActionGroupId`s.
   */
  encode(values: TFields, ctx: EncodeContext): ProposalAction[];

  /**
   * Attempt to recognise this action at `actions[cursor]`. Returns the
   * extracted fields + how many actions were consumed, or null if this def
   * doesn't match. The first def in the registry whose `decode` returns
   * non-null wins; ordering matters for ambiguity (e.g., tokenbuyer-refill-eth
   * must match before generic ETH transfer).
   */
  decode(
    actions: readonly ProposalAction[],
    cursor: number,
    ctx: DecodeContext,
  ): DecodeMatch<TFields> | null;

  /**
   * Produce display text for the consumed actions. Returns ONE description
   * per consumed action so the existing per-action UI keeps rendering
   * (TransactionSummary then aggregates these into rich cards).
   */
  describe(
    values: TFields,
    actions: readonly ProposalAction[],
    ctx: DescribeContext,
  ): ActionDescription[];

  /** Optional custom React editor. If absent, the default schema-driven form is used. */
  Editor?: LazyExoticComponent<FC<EditorProps<TFields>>>;
}
