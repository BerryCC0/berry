/**
 * Calldata encoding helpers for proposal actions.
 *
 * Every helper here returns ABI-encoded calldata for a known function shape.
 * All hand-rolled hex-padding has been replaced with viem's
 * `encodeAbiParameters` — that's the canonical, tested implementation and
 * removes a class of subtle bugs around padding widths and signed integers.
 *
 * New encoders for migrated actions live in `../actions/<category>/<action>.ts`
 * and call `encodeAbiParameters` directly. This file exists for the legacy
 * generator's still-unmigrated cases.
 */

import { Address, encodeAbiParameters, parseAbiParameters } from 'viem';

/**
 * Encode a simple `(address, uint256)` tuple — the calldata layout used by
 * `sendETH(address,uint256)`, `withdrawETH(address,uint256)`, and any other
 * "send to recipient, this much" pattern.
 */
export function encodeSendETH(recipient: Address, amount: bigint): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('address, uint256'), [
    recipient,
    amount,
  ]);
}

/**
 * Encode `(recipient, token, amount)` — the calldata layout used by a few
 * legacy treasury-side helpers. Not part of any standard ERC.
 */
export function encodeSendERC20(
  recipient: Address,
  token: Address,
  amount: bigint,
): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('address, address, uint256'), [
    recipient,
    token,
    amount,
  ]);
}

/** Encode `transferFrom(from, to, amount-or-tokenId)`. */
export function encodeTransferFrom(
  from: Address,
  to: Address,
  tokenIdOrAmount: bigint,
): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('address, address, uint256'), [
    from,
    to,
    tokenIdOrAmount,
  ]);
}

/** Encode `safeTransferFrom(from, to, tokenId)`. */
export function encodeSafeTransferFrom(
  from: Address,
  to: Address,
  tokenId: bigint,
): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('address, address, uint256'), [
    from,
    to,
    tokenId,
  ]);
}

/** Encode `delegate(delegatee)`. */
export function encodeDelegate(delegatee: Address): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('address'), [delegatee]);
}

/** Encode `transfer(to, amount)` (and `approve(spender, amount)` — same shape). */
export function encodeTransfer(to: Address, amount: bigint): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('address, uint256'), [
    to,
    amount,
  ]);
}

/** Encode a single uint256 value. */
export function encodeAdminUint256(value: bigint): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('uint256'), [value]);
}

/** Encode a single uint32 value. */
export function encodeAdminUint32(value: number): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('uint32'), [value]);
}

/** Encode a single uint16 value. */
export function encodeAdminUint16(value: number): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('uint16'), [value]);
}

/** Encode a single address value. */
export function encodeAdminAddress(address: Address): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('address'), [address]);
}

/** Encode `_setDynamicQuorumParams(minBps, maxBps, coefficient)`. */
export function encodeDynamicQuorumParams(
  minBps: number,
  maxBps: number,
  coefficient: number,
): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('uint16, uint16, uint32'), [
    minBps,
    maxBps,
    coefficient,
  ]);
}

/** Encode an empty calldata (for no-arg functions). */
export function encodeBurnVetoPower(): `0x${string}` {
  return '0x';
}

/**
 * Encode `createStream(recipient, tokenAmount, tokenAddress, startTime,
 * stopTime, nonce, predictedStreamAddress)`. The 7-arg createStream variant
 * the Sablier-style stream factory uses — see ../actions/streams/* for the
 * full action def (once migrated).
 *
 * `nonce` is encoded as uint256 over the wire even though the contract takes
 * a uint8 (smaller types are right-padded the same way in ABI encoding).
 */
export function encodeCreateStreamWithPredictedAddress(
  recipient: Address,
  tokenAmount: bigint,
  tokenAddress: Address,
  startTime: bigint,
  stopTime: bigint,
  nonce: number,
  predictedStreamAddress: Address,
): `0x${string}` {
  return encodeAbiParameters(
    parseAbiParameters(
      'address, uint256, address, uint256, uint256, uint256, address',
    ),
    [
      recipient,
      tokenAmount,
      tokenAddress,
      startTime,
      stopTime,
      BigInt(nonce),
      predictedStreamAddress,
    ],
  );
}

/**
 * Encode calldata for a single `string` argument (e.g. setBaseURI, addBackground).
 */
export function encodeStringArg(value: string): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('string'), [value]);
}

/** Encode calldata for a single `string[]` argument (e.g. addManyBackgrounds). */
export function encodeStringArrayArg(values: string[]): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('string[]'), [values]);
}

/** Encode `setClientApproval(uint32 clientId, bool approved)`. */
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
 * Encode `setAuctionRewardParams(AuctionRewardParams)` — a static struct of
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
 * Encode `setProposalRewardParams(ProposalRewardParams)` — static struct of
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
  return encodeAbiParameters(parseAbiParameters('bytes, uint80, uint16'), [
    encodedBytes,
    decompressedLength,
    itemCount,
  ]);
}

/** Encode ERC-4626 `deposit(uint256 assets, address receiver)`. */
export function encodeErc4626Deposit(
  assets: bigint,
  receiver: Address,
): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('uint256, address'), [
    assets,
    receiver,
  ]);
}

/**
 * Encode ERC-4626 `redeem(uint256 shares, address receiver, address owner)`
 * or `withdraw(uint256 assets, address receiver, address owner)` — same
 * 3-slot layout.
 */
export function encodeErc4626RedeemOrWithdraw(
  amount: bigint,
  receiver: Address,
  owner: Address,
): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('uint256, address, address'), [
    amount,
    receiver,
    owner,
  ]);
}

/**
 * Encode Octant `createStrategy(...)` for the Lido / Morpho / Sky factories.
 * All three share the same 8-arg signature; the asset is hardcoded inside
 * the factory itself (wstETH / USDC / USDS respectively).
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
 * Encode Octant PaymentSplitterFactory `createPaymentSplitter(payees, names, shares)`.
 * The factory clones a minimal proxy deterministically using
 * `salt = keccak256(abi.encode(msg.sender, deployerToSplitters[msg.sender].length))`,
 * so the deployed address is predictable client-side.
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
 * Encode Octant Yearn V3 factory `createStrategy(...)`. Same 8 base args as
 * the other factories, but with `yearnVault` and `asset` prepended so the
 * factory can wrap any Yearn V3 vault.
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
 * Encode the calldata for a meta-proposal — `propose()` called recursively to
 * create another proposal. Uses viem's `encodeAbiParameters` for the nested
 * dynamic-array structure.
 */
export function encodeMetaProposeCalldata(
  targets: Address[],
  values: bigint[],
  signatures: string[],
  calldatas: `0x${string}`[],
  description: string,
  clientId: number,
): `0x${string}` {
  return encodeAbiParameters(
    parseAbiParameters(
      'address[], uint256[], string[], bytes[], string, uint32',
    ),
    [targets, values, signatures, calldatas, description, clientId],
  );
}
