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
import {
  swapBuyEth,
  swapCowswap,
  swapUniswapV3,
  wethUnwrap,
  wethWrap,
} from './swaps';
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
  octantVaultCreateLido,
  octantVaultCreateMorpho,
  octantVaultCreateSky,
  octantVaultCreateYearn,
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
import {
  blurExecuteTrade,
  openseaCancelAll,
  openseaCancelOrder,
  openseaCollectionOffer,
  openseaFulfillOffer,
  openseaItemOffer,
  openseaListNft,
  openseaListing,
  openseaTraitOffer,
  seaportFulfill,
} from './marketplace';
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
  // ----- Multi-action aggregates (1-4 actions, longest possible) ----------
  // vault-create-* variants are variable-length (1, 2, 3, or 4 actions
  // depending on optional splitter-prepend + seed-deposit). They MUST come
  // before octantSplitterCreate (otherwise the standalone splitter matcher
  // claims the prefix of a bundled vault-create) and before octantVaultDeposit
  // (the seed pair would otherwise be claimed in isolation).
  octantVaultCreateLido,
  octantVaultCreateMorpho,
  octantVaultCreateSky,
  octantVaultCreateYearn,

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
  wethWrap,            // WETH.deposit{value} — value-bearing, signature='deposit()'
  wethUnwrap,          // WETH.withdraw(uint256)
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
  // Fork escrow: only the withdraw-via-Governor wrapper is callable by a
  // DAO proposal. `closeEscrow` and `returnTokensToOwner` on the ForkEscrow
  // are gated `onlyDAO` where `dao` is the Governor proxy — but proposals
  // execute with msg.sender = timelock, and there is NO Governor wrapper
  // for those two. The legacy templateIds for close/return-tokens are
  // intentionally NOT registered here; they remain in the legacy generator
  // (where they'll revert on-chain — surfaced as the user's failure here).
  adminForkEscrowWithdrawTokens,

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

  // ----- Marketplace ------------------------------------------------------
  // Multi-action (approve + validate) templates first so they claim the
  // 2-action bundle. The cancel/list/buy passthroughs follow.
  // Decode for the validate-based defs is shared via _validate-pattern.ts:
  // whichever def runs FIRST will claim a generic `validate(Order[])` call.
  // For round-trip purposes this is fine because the full Order JSON is
  // preserved in the field; the displayed templateId may not exactly match
  // what the proposer originally picked (collection-vs-item-vs-trait offer
  // is only distinguishable from the Order's consideration shape).
  openseaCollectionOffer,
  openseaItemOffer,
  openseaTraitOffer,
  openseaListNft,
  openseaFulfillOffer,
  openseaCancelOrder,
  openseaCancelAll,
  // Passthrough-calldata templates (decode → null, falls through to custom):
  openseaListing,
  seaportFulfill,
  blurExecuteTrade,
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
