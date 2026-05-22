/**
 * The central transaction-action registry.
 *
 * Mirrors `src/OS/Apps/OSAppConfig.ts`: each action lives in its own
 * directory under `actions/<category>/`, exports a `TransactionActionDef`,
 * and is added to the array below. The array is the source of truth — the
 * legacy generator/parser/decoder dispatch checks here first and falls back
 * to the old switch only if no action in the registry matches.
 *
 * **Order matters for decode dispatch.** The first def whose `decode()`
 * returns non-null wins. Ordering rules, in priority:
 *
 *   1. Multi-action aggregates BEFORE any single-action matcher that could
 *      claim one of their constituent actions in isolation.
 *   2. Longer/more-specific aggregates before shorter/less-specific ones
 *      (e.g., 4-action stream-restream before 2-action stream-cancel).
 *   3. Specific targets BEFORE generic ones (e.g., tokenbuyer-refill-eth
 *      before treasury-transfer; noun-delegate before treasury-delegate).
 *   4. Within a category, order doesn't matter when matchers are mutually
 *      exclusive (e.g., two defs whose decode keys off disjoint signatures).
 */

import {
  payerRepayDebt,
  paymentOnce,
  tokenbuyerRefillEth,
  treasuryDelegate,
  treasuryTransfer,
} from './treasury';
import { auctionBid, nounDelegate, nounSwap, nounTransfer } from './nouns';
import {
  paymentStream,
  streamCancel,
  streamRedirect,
  streamRestream,
} from './streams';
import { swapBuyEth, swapCowswap, swapUniswapV3 } from './swaps';
import {
  lidoClaimWithdrawal,
  lidoRequestWithdrawal,
  methUnstakeClaim,
  methUnstakeRequest,
  wstethUnwrap,
  wstethWrap,
} from './staking';
import {
  octantSplitterCreate,
  octantVaultDeposit,
  octantVaultRedeem,
  octantVaultWithdraw,
} from './octant';
import { erc20Approve, erc20RevokeApproval } from './erc20';
import {
  adminDynamicQuorum,
  adminForkDeployer,
  adminForkEscrow,
  adminForkPeriod,
  adminForkThreshold,
  adminForkTokens,
  adminLastMinuteWindow,
  adminMaxQuorum,
  adminMinQuorum,
  adminObjectionPeriod,
  adminPendingAdmin,
  adminProposalThreshold,
  adminQuorumCoefficient,
  adminTimelockAdmin,
  adminTimelockDelay,
  adminUpdatablePeriod,
  adminVotingDelay,
  adminVotingPeriod,
} from './governance-admin';
import {
  adminAuctionMinBidIncrement,
  adminAuctionPause,
  adminAuctionReservePrice,
  adminAuctionSanctionsOracle,
  adminAuctionTimeBuffer,
  adminAuctionUnpause,
} from './auction-admin';
import {
  adminRewardsAdmin,
  adminRewardsAuctionParams,
  adminRewardsClientApproval,
  adminRewardsDescriptor,
  adminRewardsDisableAuction,
  adminRewardsDisableProposal,
  adminRewardsEnableAuction,
  adminRewardsEnableProposal,
  adminRewardsEthToken,
  adminRewardsProposalParams,
  adminRewardsTransferOwnership,
  adminRewardsWithdrawToken,
} from './rewards-admin';
import {
  adminTokenbuyerAdmin,
  adminTokenbuyerBaseline,
  adminTokenbuyerDiscount,
  adminTokenbuyerMaxBaseline,
  adminTokenbuyerMaxDiscount,
  adminTokenbuyerMinBaseline,
  adminTokenbuyerMinDiscount,
  adminTokenbuyerPause,
  adminTokenbuyerPayer,
  adminTokenbuyerPriceFeed,
  adminTokenbuyerTransferOwnership,
  adminTokenbuyerUnpause,
  adminTokenbuyerWithdrawEth,
} from './tokenbuyer-admin';
import {
  adminPayerTransferOwnership,
  adminPayerWithdrawUsdc,
} from './payer-admin';
import {
  adminDataCreateCost,
  adminDataDunaAdmin,
  adminDataFeeRecipient,
  adminDataUpdateCost,
  adminDataWithdrawEth,
} from './data-admin';
import {
  adminTokenContractUriHash,
  adminTokenDescriptor,
  adminTokenMinter,
  adminTokenNoundersDao,
  adminTokenSeeder,
} from './token-admin';
import {
  adminForkEscrowClose,
  adminForkEscrowReturnTokens,
  adminForkEscrowWithdrawTokens,
} from './fork-escrow-admin';
import {
  descriptorAddBackground,
  descriptorAddManyBackgrounds,
  descriptorLockParts,
  descriptorSetArt,
  descriptorSetArtDescriptor,
  descriptorSetArtInflator,
  descriptorSetBaseUri,
  descriptorSetRenderer,
  descriptorToggleDataUri,
  descriptorTransferOwnership,
} from './descriptor';
import { openseaListing, seaportFulfill } from './marketplace';
import { metaPropose } from './meta';
import { customAction } from './custom';
import type {
  ActionDescription,
  DecodeContext,
  DecodeMatch,
  ProposalAction,
  TransactionActionDef,
} from './types';

/** The registry. Add new actions by importing them above and listing here. */
export const transactionActions: TransactionActionDef<any>[] = [
  // ----- Multi-action aggregates (4-action) -------------------------------
  streamRestream,

  // ----- Multi-action aggregates (2-3 actions) ----------------------------
  // Order each before the single-action matchers that could claim one of
  // their constituent actions in isolation.
  nounSwap,           // 2-3 actions (with optional tip leg)
  paymentStream,      // createStream + token transfer
  streamCancel,       // cancel + recoverTokens (treasury destination)
  streamRedirect,     // cancel + recoverTokens (non-treasury)
  payerRepayDebt,     // approve(USDC, Payer) + payBackDebt
  swapBuyEth,         // approve(USDC, TokenBuyer) + buyETH
  swapUniswapV3,      // approve(router) + exactInputSingle
  wstethWrap,         // approve(stETH→wstETH) + wrap
  lidoRequestWithdrawal,  // approve(wstETH→queue) + requestWithdrawalsWstETH
  methUnstakeRequest, // approve(mETH→staking) + unstakeRequest
  octantVaultDeposit, // approve(vault) + deposit(treasury)

  // ----- Single-action with specific targets ------------------------------
  // Run before generic matchers (treasury-transfer, treasury-delegate).
  tokenbuyerRefillEth, // ETH transfer specifically to TokenBuyer
  nounDelegate,        // delegate() on the Nouns token
  nounTransfer,        // safeTransferFrom from treasury on the Nouns token
  auctionBid,          // createBid on AuctionHouse
  paymentOnce,         // sendOrRegisterDebt on Payer
  swapCowswap,         // setPreSignature on CoW Settlement
  wstethUnwrap,        // unwrap on wstETH
  lidoClaimWithdrawal, // claimWithdrawal on the Lido queue
  methUnstakeClaim,    // claimUnstakeRequest on Mantle staking
  octantVaultRedeem,
  octantVaultWithdraw,
  octantSplitterCreate,

  // ----- Governance admin (all target DAO_PROXY or TREASURY) --------------
  adminDynamicQuorum,
  adminForkTokens,
  adminVotingDelay,
  adminVotingPeriod,
  adminProposalThreshold,
  adminLastMinuteWindow,
  adminObjectionPeriod,
  adminUpdatablePeriod,
  adminMinQuorum,
  adminMaxQuorum,
  adminQuorumCoefficient,
  adminForkPeriod,
  adminForkThreshold,
  adminForkDeployer,
  adminForkEscrow,
  adminPendingAdmin,
  adminTimelockDelay,
  adminTimelockAdmin,
  adminDataWithdrawEth,
  adminDataCreateCost,
  adminDataUpdateCost,
  adminDataFeeRecipient,
  adminDataDunaAdmin,
  adminTokenMinter,
  adminTokenDescriptor,
  adminTokenSeeder,
  adminTokenNoundersDao,
  adminTokenContractUriHash,
  adminForkEscrowClose,
  adminForkEscrowWithdrawTokens,
  adminForkEscrowReturnTokens,

  // ----- Auction admin ----------------------------------------------------
  adminAuctionReservePrice,
  adminAuctionTimeBuffer,
  adminAuctionMinBidIncrement,
  adminAuctionPause,
  adminAuctionUnpause,
  adminAuctionSanctionsOracle,

  // ----- ClientRewards admin ----------------------------------------------
  adminRewardsAuctionParams,
  adminRewardsProposalParams,
  adminRewardsClientApproval,
  adminRewardsEnableAuction,
  adminRewardsDisableAuction,
  adminRewardsEnableProposal,
  adminRewardsDisableProposal,
  adminRewardsAdmin,
  adminRewardsDescriptor,
  adminRewardsEthToken,
  adminRewardsWithdrawToken,
  adminRewardsTransferOwnership,

  // ----- TokenBuyer admin --------------------------------------------------
  adminTokenbuyerBaseline,
  adminTokenbuyerDiscount,
  adminTokenbuyerPause,
  adminTokenbuyerUnpause,
  adminTokenbuyerWithdrawEth,
  adminTokenbuyerAdmin,
  adminTokenbuyerPriceFeed,
  adminTokenbuyerPayer,
  adminTokenbuyerTransferOwnership,
  adminTokenbuyerMaxBaseline,
  adminTokenbuyerMinBaseline,
  adminTokenbuyerMaxDiscount,
  adminTokenbuyerMinDiscount,
  adminPayerWithdrawUsdc,
  adminPayerTransferOwnership,

  // ----- Descriptor -------------------------------------------------------
  descriptorLockParts,
  descriptorToggleDataUri,
  descriptorSetBaseUri,
  descriptorSetArt,
  descriptorSetRenderer,
  descriptorSetArtDescriptor,
  descriptorSetArtInflator,
  descriptorTransferOwnership,
  descriptorAddBackground,
  descriptorAddManyBackgrounds,

  // ----- Marketplace + meta -----------------------------------------------
  // These have null decoders — their decode() returns null so unmatched
  // calldata falls through to legacy. Only registered for encode-side
  // template-id lookup.
  openseaListing,
  seaportFulfill,
  metaPropose,

  // ----- Single-action generic --------------------------------------------
  // erc20-approve runs AFTER every approve-starting multi-action. It rejects
  // amount=0 (that's erc20-revoke-approval).
  erc20Approve,
  erc20RevokeApproval,
  treasuryDelegate, // delegate() on any ERC20Votes token (excludes Nouns)
  treasuryTransfer, // ETH or ERC-20 transfer from the treasury

  // ----- Custom (fallback) -------------------------------------------------
  // Never decodes — exists so the encode-side template-id lookup finds it.
  customAction,
];

/**
 * Look up an action def by its id. Used by the legacy `generateActionsFromTemplate`
 * shim — when the templateId matches a registered action, encoding routes
 * here instead of the old switch.
 */
export function findActionById(
  id: string,
): TransactionActionDef<any> | undefined {
  return transactionActions.find((def) => def.id === id);
}

/**
 * Walker for the decoder/parser side. Starting at `actions[cursor]`, find the
 * first registered action whose `decode()` returns a non-null match.
 */
export function findMatchingAction(
  actions: readonly ProposalAction[],
  cursor: number,
  ctx: DecodeContext,
): { def: TransactionActionDef<any>; match: DecodeMatch<unknown> } | null {
  for (const def of transactionActions) {
    const match = def.decode(actions, cursor, ctx);
    if (match) return { def, match };
  }
  return null;
}

/**
 * Convenience: try-decode + produce display descriptions in one call.
 */
export function describeAtCursor(
  actions: readonly ProposalAction[],
  cursor: number,
  ctx: DecodeContext,
): {
  def: TransactionActionDef<any>;
  consumed: number;
  descriptions: ActionDescription[];
} | null {
  const result = findMatchingAction(actions, cursor, ctx);
  if (!result) return null;
  const { def, match } = result;
  const slice = actions.slice(cursor, cursor + match.consumed);
  const descriptions = def.describe(match.values, slice, ctx);
  return { def, consumed: match.consumed, descriptions };
}
