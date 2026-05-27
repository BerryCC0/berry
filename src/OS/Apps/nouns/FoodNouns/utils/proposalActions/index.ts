/**
 * Public surface of the FN proposal action registry.
 *
 * Consumers (the propose view, the proposal-detail decoder) should import
 * from here rather than reaching into individual files — the internal
 * file layout (factories, registry, etc.) is an implementation detail.
 */
export type {
  FNActionCategory,
  FNActionDef,
  FNActionField,
  FNActionFieldType,
  FNOnChainAction,
  StagedAction,
} from './types';

export {
  FN_ACTION_DEFS,
  decodeOnChainAction,
  encodeStagedActions,
  getActionDef,
} from './registry';
