/**
 * Public API of the action registry. Consumers (the legacy generator/parser/
 * decoder shims, future Camp UI rewrites) import from here, not from
 * individual files, so we can reorganise internals without churn.
 */

export {
  describeAtCursor,
  findActionById,
  findMatchingAction,
  transactionActions,
} from './registry';

export type {
  ActionCategory,
  ActionDescription,
  ActionFieldDef,
  ActionFieldType,
  DecodeContext,
  DecodeMatch,
  DescribeContext,
  EditorProps,
  EncodeContext,
  ProposalAction,
  StreamMeta,
  TokenMeta,
  TransactionActionDef,
} from './types';

export * from './shared';
