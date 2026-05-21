/**
 * Calldata encoding helpers for proposal actions
 */

import { Address, encodeAbiParameters, parseAbiParameters } from 'viem';

/**
 * Encode a simple address + amount for ETH send
 */
export function encodeSendETH(recipient: Address, amount: bigint): `0x${string}` {
  const recipientPadded = recipient.slice(2).padStart(64, '0');
  const amountHex = amount.toString(16).padStart(64, '0');
  return `0x${recipientPadded}${amountHex}`;
}

/**
 * Encode recipient + token + amount for ERC20 operations
 */
export function encodeSendERC20(recipient: Address, token: Address, amount: bigint): `0x${string}` {
  const recipientPadded = recipient.slice(2).padStart(64, '0');
  const tokenPadded = token.slice(2).padStart(64, '0');
  const amountHex = amount.toString(16).padStart(64, '0');
  return `0x${recipientPadded}${tokenPadded}${amountHex}`;
}

/**
 * Encode transferFrom(from, to, amount/id)
 */
export function encodeTransferFrom(from: Address, to: Address, tokenIdOrAmount: bigint): `0x${string}` {
  const fromPadded = from.slice(2).padStart(64, '0');
  const toPadded = to.slice(2).padStart(64, '0');
  const valuePadded = tokenIdOrAmount.toString(16).padStart(64, '0');
  return `0x${fromPadded}${toPadded}${valuePadded}`;
}

/**
 * Encode safeTransferFrom(from, to, tokenId)
 */
export function encodeSafeTransferFrom(from: Address, to: Address, tokenId: bigint): `0x${string}` {
  const fromPadded = from.slice(2).padStart(64, '0');
  const toPadded = to.slice(2).padStart(64, '0');
  const tokenIdPadded = tokenId.toString(16).padStart(64, '0');
  return `0x${fromPadded}${toPadded}${tokenIdPadded}`;
}

/**
 * Encode delegate(delegatee)
 */
export function encodeDelegate(delegatee: Address): `0x${string}` {
  const delegateePadded = delegatee.slice(2).padStart(64, '0');
  return `0x${delegateePadded}`;
}

/**
 * Encode transfer(to, amount)
 */
export function encodeTransfer(to: Address, amount: bigint): `0x${string}` {
  const toPadded = to.slice(2).padStart(64, '0');
  const amountPadded = amount.toString(16).padStart(64, '0');
  return `0x${toPadded}${amountPadded}`;
}

/**
 * Encode a single uint256 value
 */
export function encodeAdminUint256(value: bigint): `0x${string}` {
  const valuePadded = value.toString(16).padStart(64, '0');
  return `0x${valuePadded}`;
}

/**
 * Encode a single uint32 value
 */
export function encodeAdminUint32(value: number): `0x${string}` {
  const valuePadded = value.toString(16).padStart(64, '0');
  return `0x${valuePadded}`;
}

/**
 * Encode a single uint16 value
 */
export function encodeAdminUint16(value: number): `0x${string}` {
  const valuePadded = value.toString(16).padStart(64, '0');
  return `0x${valuePadded}`;
}

/**
 * Encode a single address value
 */
export function encodeAdminAddress(address: Address): `0x${string}` {
  const addressPadded = address.slice(2).padStart(64, '0');
  return `0x${addressPadded}`;
}

/**
 * Encode dynamic quorum params: (minBps, maxBps, coefficient)
 */
export function encodeDynamicQuorumParams(minBps: number, maxBps: number, coefficient: number): `0x${string}` {
  const minBpsPadded = minBps.toString(16).padStart(64, '0');
  const maxBpsPadded = maxBps.toString(16).padStart(64, '0');
  const coefficientPadded = coefficient.toString(16).padStart(64, '0');
  return `0x${minBpsPadded}${maxBpsPadded}${coefficientPadded}`;
}

/**
 * Encode burnVetoPower (empty calldata)
 */
export function encodeBurnVetoPower(): `0x${string}` {
  return '0x';
}

/**
 * Encode createStreamWithPredictedAddress parameters
 */
export function encodeCreateStreamWithPredictedAddress(
  recipient: Address,
  tokenAmount: bigint,
  tokenAddress: Address,
  startTime: bigint,
  stopTime: bigint,
  nonce: number,
  predictedStreamAddress: Address
): `0x${string}` {
  const recipientPadded = recipient.slice(2).padStart(64, '0');
  const tokenAmountHex = tokenAmount.toString(16).padStart(64, '0');
  const tokenAddressPadded = tokenAddress.slice(2).padStart(64, '0');
  const startTimeHex = startTime.toString(16).padStart(64, '0');
  const stopTimeHex = stopTime.toString(16).padStart(64, '0');
  const noncePadded = nonce.toString(16).padStart(64, '0');
  const predictedAddressPadded = predictedStreamAddress.slice(2).padStart(64, '0');

  return `0x${recipientPadded}${tokenAmountHex}${tokenAddressPadded}${startTimeHex}${stopTimeHex}${noncePadded}${predictedAddressPadded}`;
}

/**
 * Encode calldata for a single `string` argument (e.g. setBaseURI, addBackground).
 * Uses viem's full ABI encoder so the dynamic offset + length + padding are right.
 */
export function encodeStringArg(value: string): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('string'), [value]);
}

/**
 * Encode calldata for a single `string[]` argument (e.g. addManyBackgrounds).
 */
export function encodeStringArrayArg(values: string[]): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('string[]'), [values]);
}

/**
 * Encode setClientApproval(uint32 clientId, bool approved). Two static slots.
 */
export function encodeClientApproval(
  clientId: number,
  approved: boolean,
): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('uint32, bool'), [
    clientId,
    approved,
  ]);
}

/**
 * Encode setAuctionRewardParams(AuctionRewardParams). Static struct of
 * (uint16 auctionRewardBps, uint8 minimumAuctionsBetweenUpdates).
 */
export function encodeAuctionRewardParams(
  auctionRewardBps: number,
  minimumAuctionsBetweenUpdates: number,
): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('(uint16, uint8)'), [
    [auctionRewardBps, minimumAuctionsBetweenUpdates],
  ]);
}

/**
 * Encode setProposalRewardParams(ProposalRewardParams). Static struct of
 * (uint32 minimumRewardPeriod, uint8 numProposalsEnoughForReward,
 *  uint16 proposalRewardBps, uint16 votingRewardBps,
 *  uint16 proposalEligibilityQuorumBps).
 */
export function encodeProposalRewardParams(
  minimumRewardPeriod: number,
  numProposalsEnoughForReward: number,
  proposalRewardBps: number,
  votingRewardBps: number,
  proposalEligibilityQuorumBps: number,
): `0x${string}` {
  return encodeAbiParameters(
    parseAbiParameters('(uint32, uint8, uint16, uint16, uint16)'),
    [
      [
        minimumRewardPeriod,
        numProposalsEnoughForReward,
        proposalRewardBps,
        votingRewardBps,
        proposalEligibilityQuorumBps,
      ],
    ],
  );
}

/**
 * Encode calldata for NounsDescriptorV3.addHeads/Bodies/Accessories/Glasses.
 *
 * On-chain signature is `addX(bytes encodedCompressed, uint80 decompressedLength, uint16 imageCount)`.
 * The three arguments come straight from `compressAndEncodeTrait(...)` in the
 * artwork encoder library.
 */
export function encodeAddTraitCalldata(
  encodedBytes: `0x${string}`,
  decompressedLength: bigint,
  itemCount: number,
): `0x${string}` {
  return encodeAbiParameters(
    parseAbiParameters('bytes, uint80, uint16'),
    [encodedBytes, decompressedLength, itemCount],
  );
}

/**
 * Encode ERC-4626 deposit(uint256 assets, address receiver). Two static slots.
 * Mirrors the standard signature used by every Octant Dragon vault.
 */
export function encodeErc4626Deposit(
  assets: bigint,
  receiver: Address,
): `0x${string}` {
  const assetsPadded = assets.toString(16).padStart(64, '0');
  const receiverPadded = receiver.slice(2).padStart(64, '0');
  return `0x${assetsPadded}${receiverPadded}`;
}

/**
 * Encode ERC-4626 redeem/withdraw — both share the same 3-slot layout:
 *   redeem(uint256 shares, address receiver, address owner)
 *   withdraw(uint256 assets, address receiver, address owner)
 */
export function encodeErc4626RedeemOrWithdraw(
  amount: bigint,
  receiver: Address,
  owner: Address,
): `0x${string}` {
  const amountPadded = amount.toString(16).padStart(64, '0');
  const receiverPadded = receiver.slice(2).padStart(64, '0');
  const ownerPadded = owner.slice(2).padStart(64, '0');
  return `0x${amountPadded}${receiverPadded}${ownerPadded}`;
}

/**
 * Encode Octant createStrategy(...) for Lido / Morpho / Sky factories.
 * All three share the same 8-arg signature — the asset is hardcoded inside
 * the factory itself (wstETH / USDC / USDS respectively).
 *
 *   createStrategy(
 *     string name, string symbol,
 *     address management, address keeper, address emergencyAdmin,
 *     address donationAddress, bool enableBurning,
 *     address tokenizedStrategyAddress
 *   )
 */
export function encodeOctantCreateStrategyBase(
  name: string,
  symbol: string,
  management: Address,
  keeper: Address,
  emergencyAdmin: Address,
  donationAddress: Address,
  enableBurning: boolean,
  tokenizedStrategyAddress: Address,
): `0x${string}` {
  return encodeAbiParameters(
    parseAbiParameters(
      'string, string, address, address, address, address, bool, address',
    ),
    [
      name,
      symbol,
      management,
      keeper,
      emergencyAdmin,
      donationAddress,
      enableBurning,
      tokenizedStrategyAddress,
    ],
  );
}

/**
 * Encode Octant PaymentSplitterFactory.createPaymentSplitter(...).
 *
 *   createPaymentSplitter(
 *     address[] payees,
 *     string[]  payeeNames,
 *     uint256[] shares
 *   )
 *
 * The factory clones a minimal proxy of its `implementation` deterministically
 * using `salt = keccak256(abi.encode(msg.sender, deployerToSplitters[msg.sender].length))`,
 * so the deployed address is predictable client-side via
 * `factory.predictDeterministicAddress(treasury)`.
 */
export function encodeOctantCreatePaymentSplitter(
  payees: Address[],
  payeeNames: string[],
  shares: bigint[],
): `0x${string}` {
  return encodeAbiParameters(
    parseAbiParameters('address[], string[], uint256[]'),
    [payees, payeeNames, shares],
  );
}

/**
 * Encode Octant Yearn V3 factory createStrategy(...). Same 8 base args as the
 * other factories, but with `yearnVault` and `asset` prepended so the factory
 * can wrap any Yearn V3 vault.
 *
 *   createStrategy(
 *     address yearnVault, address asset,
 *     string name, string symbol,
 *     address management, address keeper, address emergencyAdmin,
 *     address donationAddress, bool enableBurning,
 *     address tokenizedStrategyAddress
 *   )
 */
export function encodeOctantCreateStrategyYearn(
  yearnVault: Address,
  asset: Address,
  name: string,
  symbol: string,
  management: Address,
  keeper: Address,
  emergencyAdmin: Address,
  donationAddress: Address,
  enableBurning: boolean,
  tokenizedStrategyAddress: Address,
): `0x${string}` {
  return encodeAbiParameters(
    parseAbiParameters(
      'address, address, string, string, address, address, address, address, bool, address',
    ),
    [
      yearnVault,
      asset,
      name,
      symbol,
      management,
      keeper,
      emergencyAdmin,
      donationAddress,
      enableBurning,
      tokenizedStrategyAddress,
    ],
  );
}

/**
 * Encode the calldata for a meta-proposal (propose() that creates another proposal)
 * Uses viem's encodeAbiParameters for complex nested array encoding
 */
export function encodeMetaProposeCalldata(
  targets: Address[],
  values: bigint[],
  signatures: string[],
  calldatas: `0x${string}`[],
  description: string,
  clientId: number
): `0x${string}` {
  // Use viem to properly encode the complex nested structure
  const encoded = encodeAbiParameters(
    parseAbiParameters('address[], uint256[], string[], bytes[], string, uint32'),
    [targets, values, signatures, calldatas, description, clientId]
  );
  return encoded;
}
