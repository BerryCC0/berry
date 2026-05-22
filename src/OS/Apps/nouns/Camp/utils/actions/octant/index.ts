/**
 * Octant Dragon vault actions.
 *
 * Currently migrated: the simpler 4 of 8 octant templates. The 4
 * `octant-vault-create-*` variants stay in the legacy generator until a
 * focused PR migrates their splitter-prepend + seed-deposit bundle logic.
 */

export { octantVaultDeposit } from './vault-deposit';
export { octantVaultRedeem } from './vault-redeem';
export { octantVaultWithdraw } from './vault-withdraw';
export { octantSplitterCreate } from './splitter-create';
