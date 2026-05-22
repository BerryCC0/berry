/**
 * fork-escrow-admin — Fork Escrow contract admin actions.
 */

import { type Address } from 'viem';
import { FORK_ESCROW_ADDRESS } from '../../actionTemplates/constants';
import { makeNoArgAction } from '../shared/factories';
import { adminForkEscrowWithdrawTokens } from './withdraw-tokens';
import { adminForkEscrowReturnTokens } from './return-tokens';

const TARGET = FORK_ESCROW_ADDRESS as Address;

export const adminForkEscrowClose = makeNoArgAction({
  id: 'admin-fork-escrow-close',
  name: 'Close Fork Escrow',
  description: 'Stop accepting new Nouns into fork escrow',
  category: 'governance-admin',
  target: TARGET,
  signature: 'closeEscrow()',
});

export { adminForkEscrowWithdrawTokens, adminForkEscrowReturnTokens };
