/**
 * Action generation from templates
 * Converts user-friendly template field values into raw proposal actions
 */

import { Address, encodeAbiParameters, parseAbiParameters } from 'viem';
import { NOUNS_ADDRESSES, BERRY_CLIENT_ID } from '@/app/lib/nouns';
import {
  ActionTemplateType,
  ProposalAction,
  TemplateFieldValues,
} from './types';
import {
  encodeAddTraitCalldata,
  encodeAdminAddress,
  encodeAdminUint16,
  encodeAdminUint256,
  encodeAdminUint32,
  encodeAuctionRewardParams,
  encodeClientApproval,
  encodeCreateStreamWithPredictedAddress,
  encodeDelegate,
  encodeDynamicQuorumParams,
  encodeMetaProposeCalldata,
  encodeProposalRewardParams,
  encodeSafeTransferFrom,
  encodeSendETH,
  encodeStringArg,
  encodeStringArrayArg,
  encodeTransfer,
  encodeTransferFrom
} from './encoders';
import {
  AUCTION_HOUSE_ADDRESS,
  CLIENT_REWARDS_ADDRESS,
  COMMON_TOKENS,
  COWSWAP_SETTLEMENT_ADDRESS,
  DAO_PROXY_ADDRESS,
  DATA_PROXY_ADDRESS,
  DESCRIPTOR_ADDRESS,
  EXTERNAL_CONTRACTS,
  FORK_ESCROW_ADDRESS,
  LIDO_WITHDRAWAL_QUEUE_ADDRESS,
  MANTLE_STAKING_ADDRESS,
  METH_ADDRESS,
  NOUNS_TOKEN_ADDRESS,
  PAYER_ADDRESS,
  STREAM_FACTORY_ADDRESS,
  TOKEN_BUYER_ADDRESS,
  TREASURY_ADDRESS,
  UNISWAP_V3_ROUTER_ADDRESS,
  WSTETH_ADDRESS,
} from './constants';
import { parseEther, parseUnits } from './utils';
import { getTemplate } from './templates';

/**
 * Resolve a token field value (which may be either a raw 0x address or a
 * JSON-stringified {address, decimals} payload from the token-select picker)
 * into a consistent {address, decimals} pair. Falls back to 18 decimals
 * when the token isn't in our COMMON_TOKENS list.
 */
function resolveTokenField(raw: string | undefined): {
  address: string;
  decimals: number;
} {
  if (!raw) return { address: '', decimals: 18 };
  if (raw.startsWith('0x') && raw.length === 42) {
    const match = COMMON_TOKENS.find(
      (t) => t.address.toLowerCase() === raw.toLowerCase(),
    );
    return { address: raw, decimals: match?.decimals ?? 18 };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.address === 'string') {
      return {
        address: parsed.address,
        decimals:
          typeof parsed.decimals === 'number' ? parsed.decimals : 18,
      };
    }
  } catch {
    /* fall through */
  }
  return { address: '', decimals: 18 };
}

export function generateActionsFromTemplate(
  templateId: ActionTemplateType,
  fieldValues: TemplateFieldValues
): ProposalAction[] {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  switch (templateId) {
    // Unified treasury transfer: native ETH or any ERC-20.
    case 'treasury-transfer': {
      const parsed = JSON.parse(fieldValues.token || '{}');
      const decimals = typeof parsed.decimals === 'number' ? parsed.decimals : 18;
      const isNative = parsed.isNative === true
        || (typeof parsed.address === 'string'
            && parsed.address.toLowerCase() === '0x0000000000000000000000000000000000000000');
      const amount = parseUnits(fieldValues.amount || '0', decimals);

      if (isNative) {
        // Direct ETH value transfer from the treasury.
        return [{
          target: fieldValues.recipient as Address,
          value: amount.toString(),
          signature: '',
          calldata: '0x'
        }];
      }

      // ERC-20: call transfer() on the token contract — treasury is msg.sender.
      return [{
        target: parsed.address as Address,
        value: '0',
        signature: 'transfer(address,uint256)',
        calldata: encodeTransfer(
          fieldValues.recipient as Address,
          amount,
        )
      }];
    }

    // Refill TokenBuyer with ETH — single direct-value transfer. The
    // TokenBuyer contract is payable and accepts plain sends; bots then
    // arb against it bringing USDC to fund the Payer.
    case 'tokenbuyer-refill-eth':
      return [{
        target: TOKEN_BUYER_ADDRESS,
        value: parseEther(fieldValues.ethAmount || '0').toString(),
        signature: '',
        calldata: '0x'
      }];

    // Repay Payer debt — 2-action: approve USDC, then payBackDebt. The Payer
    // pulls the USDC via transferFrom and pays out the front of the debt queue.
    case 'payer-repay-debt': {
      const usdcAmount = parseUnits(fieldValues.usdcAmount || '0', 6);
      const groupId = `payer-repay-debt-${Date.now()}`;
      return [
        {
          target: EXTERNAL_CONTRACTS.USDC.address,
          value: '0',
          signature: 'approve(address,uint256)',
          calldata: encodeTransfer(PAYER_ADDRESS, usdcAmount),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 0,
        },
        {
          target: PAYER_ADDRESS,
          value: '0',
          signature: 'payBackDebt(uint256)',
          calldata: encodeAdminUint256(usdcAmount),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 1,
        },
      ];
    }

    // Treasury Swaps via TokenBuyer
    case 'swap-buy-eth': {
      // TokenBuyer requires USDC approval before it can pull tokens via transferFrom.
      // Action 1: approve TokenBuyer to spend USDC
      // Action 2: call buyETH with the USDC amount
      const usdcAmount = parseUnits(fieldValues.usdcAmount || '0', 6);
      const groupId = `swap-buy-eth-${Date.now()}`;
      return [
        {
          target: EXTERNAL_CONTRACTS.USDC.address,
          value: '0',
          signature: 'approve(address,uint256)',
          calldata: encodeTransfer(TOKEN_BUYER_ADDRESS, usdcAmount),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 0
        },
        {
          target: TOKEN_BUYER_ADDRESS,
          value: '0',
          signature: 'buyETH(uint256)',
          calldata: encodeAdminUint256(usdcAmount),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 1
        }
      ];
    }

    // Nouns Operations
    case 'noun-transfer':
      return [{
        target: NOUNS_TOKEN_ADDRESS,
        value: '0',
        signature: 'safeTransferFrom(address,address,uint256)',
        calldata: encodeSafeTransferFrom(
          TREASURY_ADDRESS,
          fieldValues.recipient as Address,
          BigInt(fieldValues.nounId || '0')
        )
      }];

    case 'noun-swap': {
      const actions: ProposalAction[] = [];
      const groupId = `noun-swap-${Date.now()}`;

      // Action 1: User's Noun → Treasury
      actions.push({
        target: NOUNS_TOKEN_ADDRESS,
        value: '0',
        signature: 'transferFrom(address,address,uint256)',
        calldata: encodeTransferFrom(
          fieldValues.userAddress as Address,
          TREASURY_ADDRESS,
          BigInt(fieldValues.userNounId || '0')
        ),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 0
      });

      // Action 2: Optional Tip → Treasury
      if (fieldValues.tipAmount && parseFloat(fieldValues.tipAmount) > 0) {
        const tipCurrency = fieldValues.tipCurrency || 'weth';

        if (tipCurrency === 'eth') {
          actions.push({
            target: TREASURY_ADDRESS,
            value: parseEther(fieldValues.tipAmount).toString(),
            signature: '',
            calldata: '0x',
            isPartOfMultiAction: true,
            multiActionGroupId: groupId,
            multiActionIndex: actions.length
          });
        } else if (tipCurrency === 'weth') {
          actions.push({
            target: EXTERNAL_CONTRACTS.WETH.address,
            value: '0',
            signature: 'transferFrom(address,address,uint256)',
            calldata: encodeTransferFrom(
              fieldValues.userAddress as Address,
              TREASURY_ADDRESS,
              parseEther(fieldValues.tipAmount)
            ),
            isPartOfMultiAction: true,
            multiActionGroupId: groupId,
            multiActionIndex: actions.length
          });
        } else if (tipCurrency === 'usdc') {
          actions.push({
            target: EXTERNAL_CONTRACTS.USDC.address,
            value: '0',
            signature: 'transferFrom(address,address,uint256)',
            calldata: encodeTransferFrom(
              fieldValues.userAddress as Address,
              TREASURY_ADDRESS,
              parseUnits(fieldValues.tipAmount, 6)
            ),
            isPartOfMultiAction: true,
            multiActionGroupId: groupId,
            multiActionIndex: actions.length
          });
        }
      }

      // Action 3: Treasury's Noun → User
      actions.push({
        target: NOUNS_TOKEN_ADDRESS,
        value: '0',
        signature: 'safeTransferFrom(address,address,uint256)',
        calldata: encodeSafeTransferFrom(
          TREASURY_ADDRESS,
          fieldValues.userAddress as Address,
          BigInt(fieldValues.treasuryNounId || '0')
        ),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: actions.length
      });

      return actions;
    }

    case 'noun-delegate':
      return [{
        target: NOUNS_TOKEN_ADDRESS,
        value: '0',
        signature: 'delegate(address)',
        calldata: encodeDelegate(fieldValues.delegatee as Address)
      }];

    // Generic ERC20Votes delegate — works for any votes-token the treasury holds.
    case 'treasury-delegate': {
      const parsed = JSON.parse(fieldValues.token || '{}');
      return [{
        target: parsed.address as Address,
        value: '0',
        signature: 'delegate(address)',
        calldata: encodeDelegate(fieldValues.delegatee as Address)
      }];
    }

    case 'auction-bid': {
      const bidAmountWei = parseUnits(fieldValues.bidAmount || '0', 18);
      return [{
        target: NOUNS_ADDRESSES.auctionHouse,
        value: bidAmountWei.toString(),
        signature: 'createBid(uint256,uint32)',
        calldata: encodeAbiParameters(
          parseAbiParameters('uint256, uint32'),
          [BigInt(fieldValues.nounId || '0'), BERRY_CLIENT_ID]
        )
      }];
    }

    // Payment Streams
    case 'payment-stream': {
      const actions: ProposalAction[] = [];
      const groupId = `payment-stream-${Date.now()}`;

      const startTimestamp = fieldValues.startDate
        ? BigInt(Math.floor(new Date(fieldValues.startDate).getTime() / 1000))
        : BigInt(0);
      const endTimestamp = fieldValues.endDate
        ? BigInt(Math.floor(new Date(fieldValues.endDate).getTime() / 1000))
        : BigInt(0);

      // The token field stores either a raw 0x address or a JSON-stringified
      // {address, decimals} from the token-select picker. Resolve both shapes.
      const tokenInfo = resolveTokenField(fieldValues.tokenAddress);
      const tokenAddress = tokenInfo.address as Address;
      const decimals = tokenInfo.decimals;
      const tokenAmount = parseUnits(fieldValues.amount || '0', decimals);

      const predictedStreamAddress = fieldValues.streamAddress as Address;

      // Action 1: Create the stream
      actions.push({
        target: STREAM_FACTORY_ADDRESS,
        value: '0',
        signature: 'createStream(address,uint256,address,uint256,uint256,uint8,address)',
        calldata: encodeCreateStreamWithPredictedAddress(
          fieldValues.recipient as Address,
          tokenAmount,
          tokenAddress,
          startTimestamp,
          endTimestamp,
          0,
          predictedStreamAddress
        ),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 0
      });

      // Action 2: Fund the stream
      actions.push({
        target: tokenAddress,
        value: '0',
        signature: 'transfer(address,uint256)',
        calldata: encodeTransfer(
          predictedStreamAddress,
          tokenAmount
        ),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 1
      });

      return actions;
    }

    case 'stream-cancel':
    case 'stream-redirect': {
      // cancel() alone only snapshots the recipient's vested share; the unvested
      // remainder stays in the stream until the payer (treasury) calls
      // recoverTokens(to). We always bundle the recovery to avoid stranded funds.
      const streamAddress = fieldValues.streamAddress as Address;
      const destination =
        templateId === 'stream-redirect'
          ? (fieldValues.destination as Address)
          : TREASURY_ADDRESS;
      const groupId = `${templateId}-${Date.now()}`;
      return [
        {
          target: streamAddress,
          value: '0',
          signature: 'cancel()',
          calldata: '0x',
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 0
        },
        {
          target: streamAddress,
          value: '0',
          signature: 'recoverTokens(address)',
          calldata: encodeAdminAddress(destination),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 1
        }
      ];
    }

    case 'stream-restream': {
      // Four-action atomic re-stream:
      //   1. cancel() on old stream — snapshots recipient's vested share
      //   2. recoverTokens(treasury) — pulls unvested back to treasury
      //   3. createStream(...) — deploys the new stream clone at predicted addr
      //   4. transfer(predicted, amount) — treasury funds the new stream
      //
      // Routing recovery through the treasury (rather than directly to the
      // predicted address) lets the treasury absorb any small shortfall caused
      // by extra vesting during the voting window. Without this routing the
      // new stream would be silently under-funded.
      const sourceStreamAddress = fieldValues.sourceStreamAddress as Address;
      const tokenInfo = resolveTokenField(fieldValues.tokenAddress);
      const tokenAddress = tokenInfo.address as Address;
      const decimals = tokenInfo.decimals;

      const startTimestamp = fieldValues.startDate
        ? BigInt(Math.floor(new Date(fieldValues.startDate).getTime() / 1000))
        : BigInt(0);
      const endTimestamp = fieldValues.endDate
        ? BigInt(Math.floor(new Date(fieldValues.endDate).getTime() / 1000))
        : BigInt(0);

      const tokenAmount = parseUnits(fieldValues.amount || '0', decimals);
      const recipient = fieldValues.recipient as Address;
      const predictedStreamAddress = fieldValues.streamAddress as Address;

      const groupId = `stream-restream-${Date.now()}`;

      return [
        {
          target: sourceStreamAddress,
          value: '0',
          signature: 'cancel()',
          calldata: '0x',
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 0,
        },
        {
          target: sourceStreamAddress,
          value: '0',
          signature: 'recoverTokens(address)',
          calldata: encodeAdminAddress(TREASURY_ADDRESS),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 1,
        },
        {
          target: STREAM_FACTORY_ADDRESS,
          value: '0',
          signature: 'createStream(address,uint256,address,uint256,uint256,uint8,address)',
          calldata: encodeCreateStreamWithPredictedAddress(
            recipient,
            tokenAmount,
            tokenAddress,
            startTimestamp,
            endTimestamp,
            0,
            predictedStreamAddress,
          ),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 2,
        },
        {
          target: tokenAddress,
          value: '0',
          signature: 'transfer(address,uint256)',
          calldata: encodeTransfer(predictedStreamAddress, tokenAmount),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 3,
        },
      ];
    }

    // One-time Payment via Payer
    case 'payment-once': {
      const amount = parseUnits(fieldValues.amount || '0', 6); // USDC has 6 decimals
      return [{
        target: PAYER_ADDRESS,
        value: '0',
        signature: 'sendOrRegisterDebt(address,uint256)',
        calldata: encodeSendETH(fieldValues.recipient as Address, amount) // Same encoding format
      }];
    }

    // Artwork — Nouns Descriptor operations
    case 'descriptor-lock-parts':
      return [{
        target: DESCRIPTOR_ADDRESS,
        value: '0',
        signature: 'lockParts()',
        calldata: '0x',
      }];

    case 'descriptor-toggle-data-uri':
      return [{
        target: DESCRIPTOR_ADDRESS,
        value: '0',
        signature: 'toggleDataURIEnabled()',
        calldata: '0x',
      }];

    case 'descriptor-set-base-uri':
      return [{
        target: DESCRIPTOR_ADDRESS,
        value: '0',
        signature: 'setBaseURI(string)',
        calldata: encodeStringArg(fieldValues.baseURI || ''),
      }];

    case 'descriptor-set-art':
      return [{
        target: DESCRIPTOR_ADDRESS,
        value: '0',
        signature: 'setArt(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    case 'descriptor-set-renderer':
      return [{
        target: DESCRIPTOR_ADDRESS,
        value: '0',
        signature: 'setRenderer(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    case 'descriptor-set-art-descriptor':
      return [{
        target: DESCRIPTOR_ADDRESS,
        value: '0',
        signature: 'setArtDescriptor(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    case 'descriptor-set-art-inflator':
      return [{
        target: DESCRIPTOR_ADDRESS,
        value: '0',
        signature: 'setArtInflator(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    case 'descriptor-transfer-ownership':
      return [{
        target: DESCRIPTOR_ADDRESS,
        value: '0',
        signature: 'transferOwnership(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    case 'descriptor-add-background':
      return [{
        target: DESCRIPTOR_ADDRESS,
        value: '0',
        signature: 'addBackground(string)',
        calldata: encodeStringArg(fieldValues.color || ''),
      }];

    case 'descriptor-add-many-backgrounds': {
      // Parse comma-separated hex colors, strip whitespace and leading '#'
      const colors = (fieldValues.colors || '')
        .split(',')
        .map((c) => c.trim().replace(/^#/, ''))
        .filter((c) => c.length > 0);
      return [{
        target: DESCRIPTOR_ADDRESS,
        value: '0',
        signature: 'addManyBackgrounds(string[])',
        calldata: encodeStringArrayArg(colors),
      }];
    }

    // Add-trait templates — the wizard stores its finished output as a
    // JSON-stringified payload in fieldValues.artwork. The payload already
    // carries the compressed bytes + decompressed length + item count, so the
    // generator only re-encodes the (bytes, uint80, uint16) tuple.
    case 'descriptor-add-trait-head':
    case 'descriptor-add-trait-body':
    case 'descriptor-add-trait-accessory':
    case 'descriptor-add-trait-glasses': {
      const signature = ({
        'descriptor-add-trait-head': 'addHeads(bytes,uint80,uint16)',
        'descriptor-add-trait-body': 'addBodies(bytes,uint80,uint16)',
        'descriptor-add-trait-accessory': 'addAccessories(bytes,uint80,uint16)',
        'descriptor-add-trait-glasses': 'addGlasses(bytes,uint80,uint16)',
      } as const)[templateId];

      let payload: {
        encodedBytes?: string;
        decompressedLength?: string;
        itemCount?: number;
      } = {};
      try {
        payload = JSON.parse(fieldValues.artwork || '{}');
      } catch {
        payload = {};
      }

      const encodedBytes = (payload.encodedBytes || '0x') as `0x${string}`;
      const decompressedLength = payload.decompressedLength
        ? BigInt(payload.decompressedLength)
        : BigInt(0);
      const itemCount = typeof payload.itemCount === 'number' ? payload.itemCount : 1;

      return [{
        target: DESCRIPTOR_ADDRESS,
        value: '0',
        signature,
        calldata: encodeAddTraitCalldata(encodedBytes, decompressedLength, itemCount),
      }];
    }

    // Admin Functions - Voting
    case 'admin-voting-delay':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setVotingDelay(uint256)',
        calldata: encodeAdminUint256(BigInt(fieldValues.blocks || '0'))
      }];

    case 'admin-voting-period':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setVotingPeriod(uint256)',
        calldata: encodeAdminUint256(BigInt(fieldValues.blocks || '0'))
      }];

    case 'admin-proposal-threshold':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setProposalThresholdBPS(uint256)',
        calldata: encodeAdminUint256(BigInt(fieldValues.bps || '0'))
      }];

    case 'admin-last-minute-window':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setLastMinuteWindowInBlocks(uint32)',
        calldata: encodeAdminUint32(Number(fieldValues.blocks || '0'))
      }];

    case 'admin-objection-period':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setObjectionPeriodDurationInBlocks(uint32)',
        calldata: encodeAdminUint32(Number(fieldValues.blocks || '0'))
      }];

    case 'admin-updatable-period':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setProposalUpdatablePeriodInBlocks(uint32)',
        calldata: encodeAdminUint32(Number(fieldValues.blocks || '0'))
      }];

    // Admin Functions - Quorum
    case 'admin-min-quorum':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setMinQuorumVotesBPS(uint16)',
        calldata: encodeAdminUint16(Number(fieldValues.bps || '0'))
      }];

    case 'admin-max-quorum':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setMaxQuorumVotesBPS(uint16)',
        calldata: encodeAdminUint16(Number(fieldValues.bps || '0'))
      }];

    case 'admin-quorum-coefficient':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setQuorumCoefficient(uint32)',
        calldata: encodeAdminUint32(Number(fieldValues.coefficient || '0'))
      }];

    case 'admin-dynamic-quorum':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setDynamicQuorumParams(uint16,uint16,uint32)',
        calldata: encodeDynamicQuorumParams(
          Number(fieldValues.minBps || '0'),
          Number(fieldValues.maxBps || '0'),
          Number(fieldValues.coefficient || '0')
        )
      }];

    // Admin Functions - Fork
    case 'admin-fork-period':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setForkPeriod(uint256)',
        calldata: encodeAdminUint256(BigInt(fieldValues.seconds || '0'))
      }];

    case 'admin-fork-threshold':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setForkThresholdBPS(uint256)',
        calldata: encodeAdminUint256(BigInt(fieldValues.bps || '0'))
      }];

    case 'admin-fork-deployer':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setForkDAODeployer(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address)
      }];

    case 'admin-fork-escrow':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setForkEscrow(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address)
      }];

    case 'admin-fork-tokens': {
      // Parse comma-separated token addresses
      const tokenAddresses = (fieldValues.tokens || '')
        .split(',')
        .map(addr => addr.trim())
        .filter(addr => addr.length === 42 && addr.startsWith('0x'));

      // Encode array of addresses for _setErc20TokensToIncludeInFork(address[])
      // ABI encoding for dynamic array:
      // - offset to array data (32 bytes)
      // - array length (32 bytes)
      // - array elements (32 bytes each, left-padded)
      const offsetHex = (32).toString(16).padStart(64, '0'); // offset is 32 (0x20)
      const lengthHex = tokenAddresses.length.toString(16).padStart(64, '0');
      const elementsHex = tokenAddresses
        .map(addr => addr.slice(2).padStart(64, '0'))
        .join('');

      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setErc20TokensToIncludeInFork(address[])',
        calldata: `0x${offsetHex}${lengthHex}${elementsHex}` as `0x${string}`
      }];
    }

    // Admin Functions - Admin
    case 'admin-pending-admin':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setPendingAdmin(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address)
      }];

    case 'admin-timelock-delay':
      return [{
        target: TREASURY_ADDRESS,
        value: '0',
        signature: '_setDelay(uint256)',
        calldata: encodeAdminUint256(BigInt(fieldValues.seconds || '0'))
      }];

    case 'admin-timelock-admin':
      return [{
        target: TREASURY_ADDRESS,
        value: '0',
        signature: '_setPendingAdmin(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address)
      }];

    // Admin Functions — TokenBuyer parameters
    case 'admin-tokenbuyer-baseline':
      return [{
        target: TOKEN_BUYER_ADDRESS,
        value: '0',
        signature: 'setBaselinePaymentTokenAmount(uint256)',
        calldata: encodeAdminUint256(parseUnits(fieldValues.amount || '0', 6))
      }];

    case 'admin-tokenbuyer-discount':
      return [{
        target: TOKEN_BUYER_ADDRESS,
        value: '0',
        signature: 'setBotDiscountBPs(uint16)',
        calldata: encodeAdminUint16(Number(fieldValues.bps || '0'))
      }];

    case 'admin-tokenbuyer-pause':
      return [{
        target: TOKEN_BUYER_ADDRESS,
        value: '0',
        signature: 'pause()',
        calldata: '0x'
      }];

    case 'admin-tokenbuyer-unpause':
      return [{
        target: TOKEN_BUYER_ADDRESS,
        value: '0',
        signature: 'unpause()',
        calldata: '0x'
      }];

    case 'admin-tokenbuyer-withdraw-eth':
      return [{
        target: TOKEN_BUYER_ADDRESS,
        value: '0',
        signature: 'withdrawETH()',
        calldata: '0x'
      }];

    case 'admin-payer-withdraw-usdc':
      return [{
        target: PAYER_ADDRESS,
        value: '0',
        signature: 'withdrawPaymentToken()',
        calldata: '0x'
      }];

    // Admin Functions — TokenBuyer extra setters
    case 'admin-tokenbuyer-admin':
      return [{
        target: TOKEN_BUYER_ADDRESS,
        value: '0',
        signature: 'setAdmin(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    case 'admin-tokenbuyer-price-feed':
      return [{
        target: TOKEN_BUYER_ADDRESS,
        value: '0',
        signature: 'setPriceFeed(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    case 'admin-tokenbuyer-payer':
      return [{
        target: TOKEN_BUYER_ADDRESS,
        value: '0',
        signature: 'setPayer(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    // Admin Functions — Auction House
    case 'admin-auction-reserve-price':
      return [{
        target: AUCTION_HOUSE_ADDRESS,
        value: '0',
        signature: 'setReservePrice(uint192)',
        calldata: encodeAdminUint256(parseUnits(fieldValues.amount || '0', 18)),
      }];

    case 'admin-auction-time-buffer':
      return [{
        target: AUCTION_HOUSE_ADDRESS,
        value: '0',
        signature: 'setTimeBuffer(uint56)',
        calldata: encodeAdminUint256(BigInt(fieldValues.seconds || '0')),
      }];

    case 'admin-auction-min-bid-increment':
      return [{
        target: AUCTION_HOUSE_ADDRESS,
        value: '0',
        signature: 'setMinBidIncrementPercentage(uint8)',
        calldata: encodeAdminUint256(BigInt(fieldValues.percentage || '0')),
      }];

    case 'admin-auction-pause':
      return [{
        target: AUCTION_HOUSE_ADDRESS,
        value: '0',
        signature: 'pause()',
        calldata: '0x',
      }];

    case 'admin-auction-unpause':
      return [{
        target: AUCTION_HOUSE_ADDRESS,
        value: '0',
        signature: 'unpause()',
        calldata: '0x',
      }];

    case 'admin-auction-sanctions-oracle':
      return [{
        target: AUCTION_HOUSE_ADDRESS,
        value: '0',
        signature: 'setSanctionsOracle(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    // Admin Functions — Client Rewards
    case 'admin-rewards-auction-params':
      return [{
        target: CLIENT_REWARDS_ADDRESS,
        value: '0',
        signature: 'setAuctionRewardParams((uint16,uint8))',
        calldata: encodeAuctionRewardParams(
          Number(fieldValues.auctionRewardBps || '0'),
          Number(fieldValues.minimumAuctionsBetweenUpdates || '0'),
        ),
      }];

    case 'admin-rewards-proposal-params':
      return [{
        target: CLIENT_REWARDS_ADDRESS,
        value: '0',
        signature: 'setProposalRewardParams((uint32,uint8,uint16,uint16,uint16))',
        calldata: encodeProposalRewardParams(
          Number(fieldValues.minimumRewardPeriod || '0'),
          Number(fieldValues.numProposalsEnoughForReward || '0'),
          Number(fieldValues.proposalRewardBps || '0'),
          Number(fieldValues.votingRewardBps || '0'),
          Number(fieldValues.proposalEligibilityQuorumBps || '0'),
        ),
      }];

    case 'admin-rewards-client-approval':
      return [{
        target: CLIENT_REWARDS_ADDRESS,
        value: '0',
        signature: 'setClientApproval(uint32,bool)',
        calldata: encodeClientApproval(
          Number(fieldValues.clientId || '0'),
          fieldValues.approved === 'true',
        ),
      }];

    case 'admin-rewards-enable-auction':
      return [{
        target: CLIENT_REWARDS_ADDRESS,
        value: '0',
        signature: 'enableAuctionRewards()',
        calldata: '0x',
      }];

    case 'admin-rewards-disable-auction':
      return [{
        target: CLIENT_REWARDS_ADDRESS,
        value: '0',
        signature: 'disableAuctionRewards()',
        calldata: '0x',
      }];

    case 'admin-rewards-enable-proposal':
      return [{
        target: CLIENT_REWARDS_ADDRESS,
        value: '0',
        signature: 'enableProposalRewards()',
        calldata: '0x',
      }];

    case 'admin-rewards-disable-proposal':
      return [{
        target: CLIENT_REWARDS_ADDRESS,
        value: '0',
        signature: 'disableProposalRewards()',
        calldata: '0x',
      }];

    case 'admin-rewards-admin':
      return [{
        target: CLIENT_REWARDS_ADDRESS,
        value: '0',
        signature: 'setAdmin(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    case 'admin-rewards-descriptor':
      return [{
        target: CLIENT_REWARDS_ADDRESS,
        value: '0',
        signature: 'setDescriptor(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    case 'admin-rewards-eth-token':
      return [{
        target: CLIENT_REWARDS_ADDRESS,
        value: '0',
        signature: 'setETHToken(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    // Admin Functions — DAO Data (Proposal Candidates) Proxy
    case 'admin-data-create-cost':
      return [{
        target: DATA_PROXY_ADDRESS,
        value: '0',
        signature: 'setCreateCandidateCost(uint256)',
        calldata: encodeAdminUint256(parseUnits(fieldValues.amount || '0', 18)),
      }];

    case 'admin-data-update-cost':
      return [{
        target: DATA_PROXY_ADDRESS,
        value: '0',
        signature: 'setUpdateCandidateCost(uint256)',
        calldata: encodeAdminUint256(parseUnits(fieldValues.amount || '0', 18)),
      }];

    case 'admin-data-fee-recipient':
      return [{
        target: DATA_PROXY_ADDRESS,
        value: '0',
        signature: 'setFeeRecipient(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    case 'admin-data-withdraw-eth':
      return [{
        target: DATA_PROXY_ADDRESS,
        value: '0',
        signature: 'withdrawETH(address,uint256)',
        calldata: encodeSendETH(
          fieldValues.recipient as Address,
          parseUnits(fieldValues.amount || '0', 18),
        ),
      }];

    case 'admin-data-duna-admin':
      return [{
        target: DATA_PROXY_ADDRESS,
        value: '0',
        signature: 'setDunaAdmin(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    // Admin Functions — Nouns Token core swaps
    case 'admin-token-minter':
      return [{
        target: NOUNS_TOKEN_ADDRESS,
        value: '0',
        signature: 'setMinter(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    case 'admin-token-descriptor':
      return [{
        target: NOUNS_TOKEN_ADDRESS,
        value: '0',
        signature: 'setDescriptor(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    case 'admin-token-seeder':
      return [{
        target: NOUNS_TOKEN_ADDRESS,
        value: '0',
        signature: 'setSeeder(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    case 'admin-token-nounders-dao':
      return [{
        target: NOUNS_TOKEN_ADDRESS,
        value: '0',
        signature: 'setNoundersDAO(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    case 'admin-token-contract-uri-hash':
      return [{
        target: NOUNS_TOKEN_ADDRESS,
        value: '0',
        signature: 'setContractURIHash(string)',
        calldata: encodeStringArg(fieldValues.hash || ''),
      }];

    // Admin Functions — Fork Escrow
    case 'admin-fork-escrow-close':
      return [{
        target: FORK_ESCROW_ADDRESS,
        value: '0',
        signature: 'closeEscrow()',
        calldata: '0x',
      }];

    case 'admin-fork-escrow-withdraw-tokens': {
      const tokenIds = (fieldValues.tokenIds || '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => BigInt(s));
      return [{
        target: FORK_ESCROW_ADDRESS,
        value: '0',
        signature: 'withdrawTokens(uint256[],address)',
        calldata: encodeAbiParameters(
          parseAbiParameters('uint256[], address'),
          [tokenIds, fieldValues.recipient as Address],
        ),
      }];
    }

    case 'admin-fork-escrow-return-tokens': {
      const tokenIds = (fieldValues.tokenIds || '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => BigInt(s));
      return [{
        target: FORK_ESCROW_ADDRESS,
        value: '0',
        signature: 'returnTokensToOwner(address,uint256[])',
        calldata: encodeAbiParameters(
          parseAbiParameters('address, uint256[]'),
          [fieldValues.owner as Address, tokenIds],
        ),
      }];
    }

    // Admin Functions — ClientRewards token sweep + ownership transfer
    case 'admin-rewards-withdraw-token': {
      const { address: tokenAddr, decimals } = resolveTokenField(
        fieldValues.token,
      );
      const amount = parseUnits(fieldValues.amount || '0', decimals);
      return [{
        target: CLIENT_REWARDS_ADDRESS,
        value: '0',
        signature: 'withdrawToken(address,address,uint256)',
        calldata: encodeAbiParameters(
          parseAbiParameters('address, address, uint256'),
          [tokenAddr as Address, fieldValues.recipient as Address, amount],
        ),
      }];
    }

    case 'admin-rewards-transfer-ownership':
      return [{
        target: CLIENT_REWARDS_ADDRESS,
        value: '0',
        signature: 'transferOwnership(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    // Admin Functions — TokenBuyer / Payer ownership transfers + admin bounds
    case 'admin-tokenbuyer-transfer-ownership':
      return [{
        target: TOKEN_BUYER_ADDRESS,
        value: '0',
        signature: 'transferOwnership(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    case 'admin-tokenbuyer-max-baseline':
      return [{
        target: TOKEN_BUYER_ADDRESS,
        value: '0',
        signature: 'setMaxAdminBaselinePaymentTokenAmount(uint256)',
        calldata: encodeAdminUint256(parseUnits(fieldValues.amount || '0', 6)),
      }];

    case 'admin-tokenbuyer-min-baseline':
      return [{
        target: TOKEN_BUYER_ADDRESS,
        value: '0',
        signature: 'setMinAdminBaselinePaymentTokenAmount(uint256)',
        calldata: encodeAdminUint256(parseUnits(fieldValues.amount || '0', 6)),
      }];

    case 'admin-tokenbuyer-max-discount':
      return [{
        target: TOKEN_BUYER_ADDRESS,
        value: '0',
        signature: 'setMaxAdminBotDiscountBPs(uint16)',
        calldata: encodeAdminUint16(Number(fieldValues.bps || '0')),
      }];

    case 'admin-tokenbuyer-min-discount':
      return [{
        target: TOKEN_BUYER_ADDRESS,
        value: '0',
        signature: 'setMinAdminBotDiscountBPs(uint16)',
        calldata: encodeAdminUint16(Number(fieldValues.bps || '0')),
      }];

    case 'admin-payer-transfer-ownership':
      return [{
        target: PAYER_ADDRESS,
        value: '0',
        signature: 'transferOwnership(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address),
      }];

    // ----- Generic ERC-20 ops --------------------------------------------
    case 'erc20-approve': {
      const { address: tokenAddr, decimals } = resolveTokenField(fieldValues.token);
      const amount = parseUnits(fieldValues.amount || '0', decimals);
      return [{
        target: tokenAddr as Address,
        value: '0',
        signature: 'approve(address,uint256)',
        calldata: encodeTransfer(fieldValues.spender as Address, amount),
      }];
    }

    case 'erc20-revoke-approval': {
      const { address: tokenAddr } = resolveTokenField(fieldValues.token);
      return [{
        target: tokenAddr as Address,
        value: '0',
        signature: 'approve(address,uint256)',
        calldata: encodeTransfer(fieldValues.spender as Address, BigInt(0)),
      }];
    }

    // ----- DEX swaps ------------------------------------------------------
    case 'swap-uniswap-v3': {
      // Two-action: approve(router) + exactInputSingle. SwapRouter02
      // (deployed at UNISWAP_V3_ROUTER_ADDRESS) takes a 7-tuple — note
      // there's NO `deadline` field in V3 SwapRouter02 (it was removed
      // when the router moved to Permit2 + Multicall).
      const { address: tokenInAddr, decimals: decimalsIn } =
        resolveTokenField(fieldValues.tokenIn);
      const tokenOut = (fieldValues.tokenOut || '') as Address;
      const fee = Number(fieldValues.fee || '3000');
      const amountIn = parseUnits(fieldValues.amountIn || '0', decimalsIn);
      // amountOutMinimum is in tokenOut units. tokenOutDecimals is set by
      // UniswapV3SwapEditor from on-chain token metadata so this scales
      // correctly across 6-decimal (USDC), 8-decimal (WBTC), and
      // 18-decimal (most) outputs. Falls back to 18 if absent.
      const decimalsOut = Number(fieldValues.tokenOutDecimals || '18');
      const amountOutMin = parseUnits(
        fieldValues.amountOutMinimum || '0',
        decimalsOut,
      );
      const groupId = `swap-uniswap-v3-${Date.now()}`;
      return [
        {
          target: tokenInAddr as Address,
          value: '0',
          signature: 'approve(address,uint256)',
          calldata: encodeTransfer(UNISWAP_V3_ROUTER_ADDRESS, amountIn),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 0,
        },
        {
          target: UNISWAP_V3_ROUTER_ADDRESS,
          value: '0',
          signature:
            'exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))',
          calldata: encodeAbiParameters(
            parseAbiParameters(
              '(address, address, uint24, address, uint256, uint256, uint160)',
            ),
            [
              [
                tokenInAddr as Address,
                tokenOut,
                fee,
                TREASURY_ADDRESS,
                amountIn,
                amountOutMin,
                BigInt(0), // sqrtPriceLimitX96 = 0 → no limit
              ],
            ],
          ),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 1,
        },
      ];
    }

    case 'swap-cowswap':
      return [{
        target: COWSWAP_SETTLEMENT_ADDRESS,
        value: '0',
        signature: 'setPreSignature(bytes,bool)',
        calldata: encodeAbiParameters(parseAbiParameters('bytes, bool'), [
          (fieldValues.orderUid || '0x') as `0x${string}`,
          true,
        ]),
      }];

    // ----- Liquid staking — Lido ----------------------------------------
    case 'lst-wsteth-unwrap':
      return [{
        target: WSTETH_ADDRESS,
        value: '0',
        signature: 'unwrap(uint256)',
        calldata: encodeAdminUint256(parseUnits(fieldValues.amount || '0', 18)),
      }];

    case 'lst-lido-request-withdrawal': {
      // Two-action: approve wstETH to the queue + requestWithdrawalsWstETH.
      // Lido's queue accepts up to 100 wstETH per array element — single
      // request per proposal here keeps the surface simple.
      const amount = parseUnits(fieldValues.amount || '0', 18);
      const groupId = `lido-withdraw-${Date.now()}`;
      return [
        {
          target: WSTETH_ADDRESS,
          value: '0',
          signature: 'approve(address,uint256)',
          calldata: encodeTransfer(LIDO_WITHDRAWAL_QUEUE_ADDRESS, amount),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 0,
        },
        {
          target: LIDO_WITHDRAWAL_QUEUE_ADDRESS,
          value: '0',
          signature: 'requestWithdrawalsWstETH(uint256[],address)',
          calldata: encodeAbiParameters(
            parseAbiParameters('uint256[], address'),
            [[amount], TREASURY_ADDRESS],
          ),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 1,
        },
      ];
    }

    case 'lst-lido-claim-withdrawal':
      return [{
        target: LIDO_WITHDRAWAL_QUEUE_ADDRESS,
        value: '0',
        signature: 'claimWithdrawal(uint256)',
        calldata: encodeAdminUint256(BigInt(fieldValues.requestId || '0')),
      }];

    // ----- Liquid staking — Mantle (mETH) -------------------------------
    case 'lst-meth-unstake-request': {
      // Two-action: approve mETH to staking contract + unstakeRequest.
      const amount = parseUnits(fieldValues.amount || '0', 18);
      const minOut = parseUnits(fieldValues.minETHAmount || '0', 18);
      const groupId = `meth-unstake-${Date.now()}`;
      return [
        {
          target: METH_ADDRESS,
          value: '0',
          signature: 'approve(address,uint256)',
          calldata: encodeTransfer(MANTLE_STAKING_ADDRESS, amount),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 0,
        },
        {
          target: MANTLE_STAKING_ADDRESS,
          value: '0',
          signature: 'unstakeRequest(uint128,uint128)',
          calldata: encodeAbiParameters(
            parseAbiParameters('uint128, uint128'),
            [amount, minOut],
          ),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: 1,
        },
      ];
    }

    case 'lst-meth-unstake-claim':
      return [{
        target: MANTLE_STAKING_ADDRESS,
        value: '0',
        signature: 'claimUnstakeRequest(uint256)',
        calldata: encodeAdminUint256(BigInt(fieldValues.requestId || '0')),
      }];

    case 'meta-propose': {
      // Create a proposal that creates another proposal when executed
      // This calls propose() on the DAO Governor with the inner proposal parameters
      const innerTitle = fieldValues.innerTitle || '';
      const innerDescription = fieldValues.innerDescription || '';
      const innerFullDescription = `# ${innerTitle}\n\n${innerDescription}`;

      // Parse the inner action from JSON (stored by nested template editor)
      let innerActions: ProposalAction[] = [];
      try {
        if (fieldValues.innerAction) {
          innerActions = JSON.parse(fieldValues.innerAction);
        }
      } catch {
        // If parsing fails, use empty action
        innerActions = [{ target: '', value: '0', signature: '', calldata: '0x' }];
      }

      // Extract arrays from inner actions
      const innerTargets = innerActions.map(a => (a.target || '0x0000000000000000000000000000000000000000') as Address);
      const innerValues = innerActions.map(a => BigInt(a.value || '0'));
      const innerSignatures = innerActions.map(a => a.signature || '');
      const innerCalldatas = innerActions.map(a => (a.calldata || '0x') as `0x${string}`);

      // Encode the propose() call with nested arrays
      // propose(address[],uint256[],string[],bytes[],string,uint32)
      const calldata = encodeMetaProposeCalldata(
        innerTargets,
        innerValues,
        innerSignatures,
        innerCalldatas,
        innerFullDescription,
        BERRY_CLIENT_ID
      );

      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: 'propose(address[],uint256[],string[],bytes[],string,uint32)',
        calldata
      }];
    }

    case 'custom':
      return [{
        target: fieldValues.target as string || '',
        value: fieldValues.value as string || '0',
        signature: fieldValues.signature as string || '',
        calldata: fieldValues.calldata as string || '0x'
      }];

    default:
      throw new Error(`Template not implemented: ${templateId}`);
  }
}
