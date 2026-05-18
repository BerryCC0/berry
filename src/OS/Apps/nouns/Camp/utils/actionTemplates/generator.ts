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
  encodeAdminAddress,
  encodeAdminUint16,
  encodeAdminUint256,
  encodeAdminUint32,
  encodeCreateStreamWithPredictedAddress,
  encodeDelegate,
  encodeDynamicQuorumParams,
  encodeMetaProposeCalldata,
  encodeSafeTransferFrom,
  encodeSendETH,
  encodeTransfer,
  encodeTransferFrom
} from './encoders';
import {
  COMMON_TOKENS,
  DAO_PROXY_ADDRESS,
  EXTERNAL_CONTRACTS,
  NOUNS_TOKEN_ADDRESS,
  STREAM_FACTORY_ADDRESS,
  TREASURY_ADDRESS
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

    // Treasury Swaps via TokenBuyer
    case 'swap-buy-eth': {
      // TokenBuyer requires USDC approval before it can pull tokens via transferFrom.
      // Action 1: approve TokenBuyer to spend USDC
      // Action 2: call buyETH with the USDC amount
      const TOKEN_BUYER_ADDRESS = '0x4f2aCdc74f6941390d9b1804faBc3E780388cfe5' as Address;
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

    case 'swap-sell-eth': {
      // Payer contract can sell ETH for USDC
      const PAYER_ADDRESS = '0xd97Bcd9f47cEe35c0a9ec1dc40C1269afc9E8E1D' as Address;
      const ethAmount = parseEther(fieldValues.ethAmount || '0');
      return [{
        target: PAYER_ADDRESS,
        value: ethAmount.toString(),
        signature: 'payBackDebt(uint256)',
        calldata: encodeAdminUint256(ethAmount)
      }];
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
      const PAYER_ADDRESS = '0xd97Bcd9f47cEe35c0a9ec1dc40C1269afc9E8E1D' as Address;
      const amount = parseUnits(fieldValues.amount || '0', 6); // USDC has 6 decimals
      return [{
        target: PAYER_ADDRESS,
        value: '0',
        signature: 'sendOrRegisterDebt(address,uint256)',
        calldata: encodeSendETH(fieldValues.recipient as Address, amount) // Same encoding format
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
