/**
 * Generic ERC-20 ops. Both registered AFTER every approve-starting
 * multi-action so those claim their sequences first.
 */

export { erc20Approve } from './approve';
export { erc20RevokeApproval } from './revoke-approval';
