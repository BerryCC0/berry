/**
 * Action parsing - reverse engineering actions back to templates
 */

import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  ActionTemplateState,
  ProposalAction
} from './types';
import {
  COMMON_TOKENS,
  DAO_PROXY_ADDRESS,
  DESCRIPTOR_ADDRESS,
  EXTERNAL_CONTRACTS,
  KNOWN_VOTES_TOKENS,
  NOUNS_TOKEN_ADDRESS,
  PAYER_ADDRESS,
  STREAM_FACTORY_ADDRESS,
  TOKEN_BUYER_ADDRESS,
  TREASURY_ADDRESS
} from './constants';
import { formatUnits } from './utils';
import type { ActionTemplateType } from './types';

/**
 * Map descriptor add-trait function signatures to the corresponding template
 * id. Used during reverse engineering — see add-trait matcher below.
 */
const DESCRIPTOR_ADD_TRAIT_SIGS: Record<string, ActionTemplateType> = {
  'addHeads(bytes,uint80,uint16)': 'descriptor-add-trait-head',
  'addBodies(bytes,uint80,uint16)': 'descriptor-add-trait-body',
  'addAccessories(bytes,uint80,uint16)': 'descriptor-add-trait-accessory',
  'addGlasses(bytes,uint80,uint16)': 'descriptor-add-trait-glasses',
};

const DESCRIPTOR_TRAIT_TYPES: Record<ActionTemplateType, 'head' | 'body' | 'accessory' | 'glasses' | undefined> = {
  'descriptor-add-trait-head': 'head',
  'descriptor-add-trait-body': 'body',
  'descriptor-add-trait-accessory': 'accessory',
  'descriptor-add-trait-glasses': 'glasses',
} as Record<ActionTemplateType, 'head' | 'body' | 'accessory' | 'glasses' | undefined>;

/**
 * Build a 'treasury-transfer' template state from the resolved token info
 * and on-chain amount. Centralized so the ETH / USDC / WETH parser cases
 * stay consistent.
 */
function treasuryTransferState(input: {
  symbol: string;
  address: string;
  decimals: number;
  isNative: boolean;
  recipient: string;
  amountRaw: string;
}): ActionTemplateState {
  return {
    templateId: 'treasury-transfer',
    fieldValues: {
      token: JSON.stringify({
        symbol: input.symbol,
        address: input.address,
        decimals: input.decimals,
        isNative: input.isNative,
      }),
      recipient: input.recipient,
      amount: formatUnits(BigInt(input.amountRaw), input.decimals),
    },
    generatedActions: [],
  };
}

/**
 * Parse a proposal action back to its template form
 * Attempts to match the action to a known template and extract field values
 */
export function parseActionToTemplate(action: ProposalAction): ActionTemplateState {
  const target = action.target.toLowerCase();
  const signature = action.signature;
  const calldata = action.calldata || '0x';
  const value = action.value;

  // Try to match the action to a known template
  const matched = matchActionToTemplate(target, signature, calldata, value);

  if (matched) {
    return matched;
  }

  // Default to custom template
  return {
    templateId: 'custom',
    fieldValues: {
      target: action.target,
      value: action.value,
      signature: action.signature,
      calldata: action.calldata
    },
    generatedActions: [action]
  };
}

/**
 * Parse multiple actions to template states
 * Handles multi-action templates by grouping related actions
 */
export function parseActionsToTemplates(actions: ProposalAction[]): ActionTemplateState[] {
  if (!actions || actions.length === 0) {
    return [];
  }

  const templateStates: ActionTemplateState[] = [];
  const processedIndices = new Set<number>();

  for (let i = 0; i < actions.length; i++) {
    if (processedIndices.has(i)) continue;

    const action = actions[i];

    // Check if this is part of a buy-eth multi-action sequence (approve + buyETH)
    const buyEthResult = tryMatchBuyEth(actions, i);
    if (buyEthResult) {
      templateStates.push(buyEthResult.state);
      buyEthResult.consumedIndices.forEach(idx => processedIndices.add(idx));
      continue;
    }

    // Check if this is a payer-repay-debt multi-action sequence (approve USDC + payBackDebt)
    const repayDebtResult = tryMatchPayerRepayDebt(actions, i);
    if (repayDebtResult) {
      templateStates.push(repayDebtResult.state);
      repayDebtResult.consumedIndices.forEach(idx => processedIndices.add(idx));
      continue;
    }

    // Check if this is part of a noun-swap multi-action sequence
    const nounSwapResult = tryMatchNounSwap(actions, i);
    if (nounSwapResult) {
      templateStates.push(nounSwapResult.state);
      nounSwapResult.consumedIndices.forEach(idx => processedIndices.add(idx));
      continue;
    }

    // Check if this is a 4-action stream-restream sequence (must run before
    // the 2-action cancel+recover matcher below, since the first two actions
    // of a restream are identical).
    const restreamResult = tryMatchStreamRestream(actions, i);
    if (restreamResult) {
      templateStates.push(restreamResult.state);
      restreamResult.consumedIndices.forEach(idx => processedIndices.add(idx));
      continue;
    }

    // Check if this is a cancel + recoverTokens pair (cancel or redirect)
    const streamCancelResult = tryMatchStreamCancelRecover(actions, i);
    if (streamCancelResult) {
      templateStates.push(streamCancelResult.state);
      streamCancelResult.consumedIndices.forEach(idx => processedIndices.add(idx));
      continue;
    }

    // Single action match
    processedIndices.add(i);
    templateStates.push(parseActionToTemplate(action));
  }

  return templateStates;
}

/**
 * Try to match a single action to a template
 */
function matchActionToTemplate(
  target: string,
  signature: string,
  calldata: string,
  value: string
): ActionTemplateState | null {
  // Refill TokenBuyer with ETH — direct ETH transfer specifically to the
  // TokenBuyer contract. Must run BEFORE the generic ETH-transfer matcher so
  // it doesn't get classified as a treasury-transfer.
  if (
    !signature &&
    (!calldata || calldata === '0x') &&
    value &&
    value !== '0' &&
    target === TOKEN_BUYER_ADDRESS.toLowerCase()
  ) {
    return {
      templateId: 'tokenbuyer-refill-eth',
      fieldValues: {
        ethAmount: formatUnits(BigInt(value), 18),
      },
      generatedActions: [],
    };
  }

  // Treasury ETH transfer (direct value transfer with no function call).
  // Detected by: empty signature, empty calldata, and non-zero value.
  if (!signature && (!calldata || calldata === '0x') && value && value !== '0') {
    try {
      return treasuryTransferState({
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        isNative: true,
        recipient: target,
        amountRaw: value,
      });
    } catch {
      // Fall through if parsing fails
    }
  }

  // Legacy: Treasury ETH transfer via sendETH (for backwards compatibility)
  if (target === TREASURY_ADDRESS.toLowerCase() && signature === 'sendETH(address,uint256)') {
    const decoded = decodeCalldata(calldata, ['address', 'uint256']);
    if (decoded) {
      return treasuryTransferState({
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        isNative: true,
        recipient: decoded[0] as string,
        amountRaw: decoded[1] as string,
      });
    }
  }

  // USDC transfer (directly on USDC contract)
  if (target === EXTERNAL_CONTRACTS.USDC.address.toLowerCase() && signature === 'transfer(address,uint256)') {
    const decoded = decodeCalldata(calldata, ['address', 'uint256']);
    if (decoded) {
      return treasuryTransferState({
        symbol: 'USDC',
        address: EXTERNAL_CONTRACTS.USDC.address,
        decimals: 6,
        isNative: false,
        recipient: decoded[0] as string,
        amountRaw: decoded[1] as string,
      });
    }
  }

  // WETH transfer (directly on WETH contract)
  if (target === EXTERNAL_CONTRACTS.WETH.address.toLowerCase() && signature === 'transfer(address,uint256)') {
    const decoded = decodeCalldata(calldata, ['address', 'uint256']);
    if (decoded) {
      return treasuryTransferState({
        symbol: 'WETH',
        address: EXTERNAL_CONTRACTS.WETH.address,
        decimals: 18,
        isNative: false,
        recipient: decoded[0] as string,
        amountRaw: decoded[1] as string,
      });
    }
  }

  // Noun transfer from treasury
  if (target === NOUNS_TOKEN_ADDRESS.toLowerCase() && signature === 'safeTransferFrom(address,address,uint256)') {
    const decoded = decodeCalldata(calldata, ['address', 'address', 'uint256']);
    if (decoded) {
      const from = (decoded[0] as string).toLowerCase();
      const to = decoded[1] as string;
      const nounId = decoded[2] as string;

      // Check if it's a treasury → user transfer
      if (from === TREASURY_ADDRESS.toLowerCase()) {
        return {
          templateId: 'noun-transfer',
          fieldValues: {
            recipient: to,
            nounId: nounId
          },
          generatedActions: []
        };
      }
    }
  }

  // Delegate — NOUNS-specific case keeps the existing noun-delegate template.
  if (target === NOUNS_TOKEN_ADDRESS.toLowerCase() && signature === 'delegate(address)') {
    const decoded = decodeCalldata(calldata, ['address']);
    if (decoded) {
      return {
        templateId: 'noun-delegate',
        fieldValues: {
          delegatee: decoded[0] as string
        },
        generatedActions: []
      };
    }
  }

  // Delegate — any other token (ENS, COMP, UNI, ARB, ...) goes to the generic
  // treasury-delegate template. Token info is filled in from a small known-votes
  // registry when possible; otherwise we round-trip with the bare address so the
  // user can re-pick from the treasury holdings dropdown.
  if (signature === 'delegate(address)') {
    const decoded = decodeCalldata(calldata, ['address']);
    if (decoded) {
      const meta = KNOWN_VOTES_TOKENS[target] ?? {
        symbol: target.slice(0, 6) + '…' + target.slice(-4),
        decimals: 18,
      };
      return {
        templateId: 'treasury-delegate',
        fieldValues: {
          token: JSON.stringify({
            symbol: meta.symbol,
            address: target,
            decimals: meta.decimals,
            isNative: false,
          }),
          delegatee: decoded[0] as string,
        },
        generatedActions: [],
      };
    }
  }

  // Auction Bid
  const AUCTION_HOUSE_ADDRESS = NOUNS_ADDRESSES.auctionHouse.toLowerCase();
  if (target === AUCTION_HOUSE_ADDRESS && signature === 'createBid(uint256,uint32)') {
    const decoded = decodeCalldata(calldata, ['uint256', 'uint32']);
    if (decoded) {
      return {
        templateId: 'auction-bid',
        fieldValues: {
          nounId: decoded[0] as string,
          bidAmount: formatUnits(BigInt(value), 18)
        },
        generatedActions: []
      };
    }
  }

  // Buy ETH (TokenBuyer) — legacy single-action fallback (no preceding approve)
  if (target === TOKEN_BUYER_ADDRESS.toLowerCase() && signature === 'buyETH(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'swap-buy-eth',
        fieldValues: {
          usdcAmount: formatUnits(BigInt(decoded[0] as string), 6)
        },
        generatedActions: []
      };
    }
  }

  // Stream cancel: cancel() with no args, no value. Any target.
  // Matched late so it doesn't shadow more specific templates above.
  if (
    signature === 'cancel()' &&
    (!calldata || calldata === '0x') &&
    (!value || value === '0')
  ) {
    return {
      templateId: 'stream-cancel',
      fieldValues: { streamAddress: target },
      generatedActions: []
    };
  }

  // Descriptor add-trait calls — reverse engineering can only recover the
  // raw bytes; the original PNG, palette snapshot, and signed agreement are
  // not on-chain. We produce a partial template state flagged readOnly:true
  // so the wizard opens in a read-only display mode.
  if (
    target === DESCRIPTOR_ADDRESS.toLowerCase() &&
    DESCRIPTOR_ADD_TRAIT_SIGS[signature]
  ) {
    const tmplId = DESCRIPTOR_ADD_TRAIT_SIGS[signature];
    const traitType = DESCRIPTOR_TRAIT_TYPES[tmplId];
    const payload = {
      readOnly: true,
      traitType: traitType ?? 'head',
      // We don't bother decoding bytes/uint80/uint16 — the values would be
      // unusable without the matching palette snapshot anyway. Re-encoding the
      // exact same calldata on save would require the original encodedBytes
      // (lost in round-trip), so we keep the encodedBytes from the original
      // calldata payload.
      encodedBytes: '0x',
      decompressedLength: '0',
      itemCount: 1,
      pixels: [],
      paletteSnapshot: [],
      paletteIndex: 0,
      contributionName: '',
      contributionSpec: '',
      signer: '0x0000000000000000000000000000000000000000',
      signature: '0x',
      agreementText: '',
      thumbnailDataUrl: '',
      generatedMarkdown: '',
    };
    return {
      templateId: tmplId,
      fieldValues: { artwork: JSON.stringify(payload) },
      generatedActions: [],
    };
  }

  // Admin functions on DAO Proxy
  if (target === DAO_PROXY_ADDRESS.toLowerCase()) {
    const adminMatch = matchAdminAction(signature, calldata);
    if (adminMatch) {
      return adminMatch;
    }
  }

  return null;
}

/**
 * Try to match a buy-eth multi-action sequence (approve USDC + buyETH)
 */
function tryMatchBuyEth(
  actions: ProposalAction[],
  startIndex: number
): { state: ActionTemplateState; consumedIndices: number[] } | null {
  const action = actions[startIndex];
  const target = action.target.toLowerCase();
  const signature = action.signature;

  const USDC_ADDRESS = EXTERNAL_CONTRACTS.USDC.address.toLowerCase();
  const TOKEN_BUYER_ADDR = TOKEN_BUYER_ADDRESS.toLowerCase();

  // Sequence starts with approve(address,uint256) on the USDC contract
  if (target !== USDC_ADDRESS || signature !== 'approve(address,uint256)') return null;

  const approveDecoded = decodeCalldata(action.calldata || '0x', ['address', 'uint256']);
  if (!approveDecoded) return null;

  const spender = (approveDecoded[0] as string).toLowerCase();
  if (spender !== TOKEN_BUYER_ADDR) return null;

  // Next action must be buyETH(uint256) on the TokenBuyer
  const nextIndex = startIndex + 1;
  if (nextIndex >= actions.length) return null;

  const nextAction = actions[nextIndex];
  const nextTarget = nextAction.target.toLowerCase();
  const nextSignature = nextAction.signature;

  if (nextTarget !== TOKEN_BUYER_ADDR || nextSignature !== 'buyETH(uint256)') return null;

  const buyDecoded = decodeCalldata(nextAction.calldata || '0x', ['uint256']);
  if (!buyDecoded) return null;

  const usdcAmount = formatUnits(BigInt(buyDecoded[0] as string), 6);

  return {
    state: {
      templateId: 'swap-buy-eth',
      fieldValues: { usdcAmount },
      generatedActions: []
    },
    consumedIndices: [startIndex, nextIndex]
  };
}

/**
 * Try to match a payer-repay-debt 2-action sequence:
 *   1. approve(Payer, X) on USDC
 *   2. payBackDebt(X) on Payer
 */
function tryMatchPayerRepayDebt(
  actions: ProposalAction[],
  startIndex: number,
): { state: ActionTemplateState; consumedIndices: number[] } | null {
  const action = actions[startIndex];
  const target = action.target.toLowerCase();
  const signature = action.signature;

  const USDC_ADDRESS = EXTERNAL_CONTRACTS.USDC.address.toLowerCase();
  const PAYER_ADDR = PAYER_ADDRESS.toLowerCase();

  if (target !== USDC_ADDRESS || signature !== 'approve(address,uint256)') return null;

  const approveDecoded = decodeCalldata(action.calldata || '0x', ['address', 'uint256']);
  if (!approveDecoded) return null;
  if ((approveDecoded[0] as string).toLowerCase() !== PAYER_ADDR) return null;

  const nextIndex = startIndex + 1;
  if (nextIndex >= actions.length) return null;
  const next = actions[nextIndex];
  if (next.target.toLowerCase() !== PAYER_ADDR) return null;
  if (next.signature !== 'payBackDebt(uint256)') return null;

  const repayDecoded = decodeCalldata(next.calldata || '0x', ['uint256']);
  if (!repayDecoded) return null;
  const usdcAmount = formatUnits(BigInt(repayDecoded[0] as string), 6);

  return {
    state: {
      templateId: 'payer-repay-debt',
      fieldValues: { usdcAmount },
      generatedActions: [],
    },
    consumedIndices: [startIndex, nextIndex],
  };
}

/**
 * Try to match a noun-swap multi-action sequence
 */
function tryMatchNounSwap(
  actions: ProposalAction[],
  startIndex: number
): { state: ActionTemplateState; consumedIndices: number[] } | null {
  const action = actions[startIndex];
  const target = action.target.toLowerCase();
  const signature = action.signature;

  // Noun swap starts with transferFrom (user's noun to treasury)
  if (target === NOUNS_TOKEN_ADDRESS.toLowerCase() && signature === 'transferFrom(address,address,uint256)') {
    const decoded = decodeCalldata(action.calldata || '0x', ['address', 'address', 'uint256']);
    if (!decoded) return null;

    const userAddress = decoded[0] as string;
    const toAddress = (decoded[1] as string).toLowerCase();
    const userNounId = decoded[2] as string;

    // Must transfer to treasury
    if (toAddress !== TREASURY_ADDRESS.toLowerCase()) return null;

    // Look for the corresponding safeTransferFrom (treasury's noun to user)
    const consumedIndices = [startIndex];
    let tipCurrency: string | undefined;
    let tipAmount: string | undefined;
    let treasuryNounId: string | undefined;

    for (let i = startIndex + 1; i < actions.length; i++) {
      const nextAction = actions[i];
      const nextTarget = nextAction.target.toLowerCase();
      const nextSig = nextAction.signature;

      // Check for tip transfer (WETH/USDC transferFrom or ETH value)
      if (nextSig === 'transferFrom(address,address,uint256)') {
        if (nextTarget === EXTERNAL_CONTRACTS.WETH.address.toLowerCase()) {
          const tipDecoded = decodeCalldata(nextAction.calldata || '0x', ['address', 'address', 'uint256']);
          if (tipDecoded) {
            tipCurrency = 'weth';
            tipAmount = formatUnits(BigInt(tipDecoded[2] as string), 18);
            consumedIndices.push(i);
          }
        } else if (nextTarget === EXTERNAL_CONTRACTS.USDC.address.toLowerCase()) {
          const tipDecoded = decodeCalldata(nextAction.calldata || '0x', ['address', 'address', 'uint256']);
          if (tipDecoded) {
            tipCurrency = 'usdc';
            tipAmount = formatUnits(BigInt(tipDecoded[2] as string), 6);
            consumedIndices.push(i);
          }
        }
      }

      // Check for treasury → user noun transfer
      if (nextTarget === NOUNS_TOKEN_ADDRESS.toLowerCase() && nextSig === 'safeTransferFrom(address,address,uint256)') {
        const transferDecoded = decodeCalldata(nextAction.calldata || '0x', ['address', 'address', 'uint256']);
        if (transferDecoded) {
          const fromAddr = (transferDecoded[0] as string).toLowerCase();
          const toAddr = (transferDecoded[1] as string).toLowerCase();

          if (fromAddr === TREASURY_ADDRESS.toLowerCase() && toAddr === userAddress.toLowerCase()) {
            treasuryNounId = transferDecoded[2] as string;
            consumedIndices.push(i);

            // We found all parts of the noun swap
            return {
              state: {
                templateId: 'noun-swap',
                fieldValues: {
                  userAddress: userAddress,
                  userNounId: userNounId,
                  treasuryNounId: treasuryNounId,
                  tipCurrency: tipCurrency,
                  tipAmount: tipAmount
                },
                generatedActions: consumedIndices.map(idx => actions[idx])
              },
              consumedIndices
            };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Try to match a stream cancel + recoverTokens pair.
 * If destination is the treasury → 'stream-cancel'.
 * Otherwise → 'stream-redirect'.
 */
function tryMatchStreamCancelRecover(
  actions: ProposalAction[],
  startIndex: number
): { state: ActionTemplateState; consumedIndices: number[] } | null {
  const action = actions[startIndex];
  if (action.signature !== 'cancel()') return null;

  const nextIndex = startIndex + 1;
  if (nextIndex >= actions.length) return null;

  const next = actions[nextIndex];
  if (next.signature !== 'recoverTokens(address)') return null;
  if (next.target.toLowerCase() !== action.target.toLowerCase()) return null;

  const decoded = decodeCalldata(next.calldata || '0x', ['address']);
  if (!decoded) return null;
  const destination = decoded[0] as string;

  const isTreasury = destination.toLowerCase() === TREASURY_ADDRESS.toLowerCase();

  return {
    state: {
      templateId: isTreasury ? 'stream-cancel' : 'stream-redirect',
      fieldValues: isTreasury
        ? { streamAddress: action.target }
        : { streamAddress: action.target, destination },
      generatedActions: []
    },
    consumedIndices: [startIndex, nextIndex]
  };
}

/**
 * Convert a unix-second timestamp to the YYYY-MM-DDTHH:mm format that
 * `<input type="datetime-local">` accepts, in the user's local timezone
 * (matching how the date field was originally entered).
 */
function unixToLocalDateTimeInput(unixSeconds: bigint): string {
  const d = new Date(Number(unixSeconds) * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Try to match a 4-action stream-restream sequence:
 *   1. cancel() on X
 *   2. recoverTokens(address) on X with TREASURY destination
 *   3. createStream(...) on STREAM_FACTORY with predicted address P
 *   4. transfer(address,uint256) on the token contract to P
 *
 * Must run BEFORE tryMatchStreamCancelRecover since the first two actions of
 * a restream look identical to a stream-cancel — only the trailing createStream
 * + transfer distinguish them.
 */
function tryMatchStreamRestream(
  actions: ProposalAction[],
  startIndex: number
): { state: ActionTemplateState; consumedIndices: number[] } | null {
  if (startIndex + 3 >= actions.length) return null;
  const [a, b, c, d] = [
    actions[startIndex],
    actions[startIndex + 1],
    actions[startIndex + 2],
    actions[startIndex + 3],
  ];

  // Action 1: cancel() on some target (= the source stream)
  if (a.signature !== 'cancel()') return null;
  const sourceStreamAddress = a.target.toLowerCase();

  // Action 2: recoverTokens(address) on the same target, to the treasury.
  if (b.signature !== 'recoverTokens(address)') return null;
  if (b.target.toLowerCase() !== sourceStreamAddress) return null;
  const recoverDecoded = decodeCalldata(b.calldata || '0x', ['address']);
  if (!recoverDecoded) return null;
  if ((recoverDecoded[0] as string).toLowerCase() !== TREASURY_ADDRESS.toLowerCase()) return null;

  // Action 3: createStream(...) on the StreamFactory.
  if (!c.signature || !c.signature.startsWith('createStream(')) return null;
  if (c.target.toLowerCase() !== STREAM_FACTORY_ADDRESS.toLowerCase()) return null;

  // 7-arg createStream variant — uint8 ABI-encodes the same as uint256 over
  // the wire, so decoding as uint256 works.
  const createDecoded = decodeCalldata(c.calldata || '0x', [
    'address', // recipient
    'uint256', // tokenAmount
    'address', // tokenAddress
    'uint256', // startTime
    'uint256', // stopTime
    'uint256', // nonce
    'address', // predictedStreamAddress
  ]);
  if (!createDecoded) return null;
  const newRecipient = createDecoded[0] as string;
  const tokenAmountRaw = createDecoded[1] as string;
  const tokenAddress = (createDecoded[2] as string).toLowerCase();
  const startTime = BigInt(createDecoded[3] as string);
  const stopTime = BigInt(createDecoded[4] as string);
  const predictedAddress = (createDecoded[6] as string).toLowerCase();

  // Action 4: transfer(predictedAddress, tokenAmountRaw) on the token contract.
  if (d.signature !== 'transfer(address,uint256)') return null;
  if (d.target.toLowerCase() !== tokenAddress) return null;
  const transferDecoded = decodeCalldata(d.calldata || '0x', ['address', 'uint256']);
  if (!transferDecoded) return null;
  if ((transferDecoded[0] as string).toLowerCase() !== predictedAddress) return null;
  if (BigInt(transferDecoded[1] as string) !== BigInt(tokenAmountRaw)) return null;

  // Decimals — derive from the known COMMON_TOKENS list. Falls back to 18
  // for unknown tokens, which means the amount display may be off but the
  // round-trip is still correct in raw units.
  const knownToken = COMMON_TOKENS.find(
    (t) => t.address.toLowerCase() === tokenAddress,
  );
  const decimals = knownToken?.decimals ?? 18;

  return {
    state: {
      templateId: 'stream-restream',
      fieldValues: {
        sourceStreamAddress: a.target,
        recipient: newRecipient,
        amount: formatUnits(BigInt(tokenAmountRaw), decimals),
        startDate: unixToLocalDateTimeInput(startTime),
        endDate: unixToLocalDateTimeInput(stopTime),
        streamAddress: createDecoded[6] as string,
        // tokenAddress is an "internal" field — populated so PredictedStreamAddress
        // and the generator can read it without it being user-visible.
        tokenAddress: createDecoded[2] as string,
      },
      generatedActions: [],
    },
    consumedIndices: [
      startIndex,
      startIndex + 1,
      startIndex + 2,
      startIndex + 3,
    ],
  };
}

/**
 * Match admin function signatures
 */
function matchAdminAction(signature: string, calldata: string): ActionTemplateState | null {
  // Voting parameters
  if (signature === '_setVotingDelay(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-voting-delay',
        fieldValues: { blocks: decoded[0] as string },
        generatedActions: []
      };
    }
  }

  if (signature === '_setVotingPeriod(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-voting-period',
        fieldValues: { blocks: decoded[0] as string },
        generatedActions: []
      };
    }
  }

  if (signature === '_setProposalThresholdBPS(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-proposal-threshold',
        fieldValues: { bps: decoded[0] as string },
        generatedActions: []
      };
    }
  }

  if (signature === '_setLastMinuteWindowInBlocks(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-last-minute-window',
        fieldValues: { blocks: decoded[0] as string },
        generatedActions: []
      };
    }
  }

  if (signature === '_setObjectionPeriodDurationInBlocks(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-objection-period',
        fieldValues: { blocks: decoded[0] as string },
        generatedActions: []
      };
    }
  }

  if (signature === '_setProposalUpdatablePeriodInBlocks(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-updatable-period',
        fieldValues: { blocks: decoded[0] as string },
        generatedActions: []
      };
    }
  }

  // Quorum parameters
  if (signature === '_setMinQuorumVotesBPS(uint16)') {
    const decoded = decodeCalldata(calldata, ['uint16']);
    if (decoded) {
      return {
        templateId: 'admin-min-quorum',
        fieldValues: { bps: decoded[0] as string },
        generatedActions: []
      };
    }
  }

  if (signature === '_setMaxQuorumVotesBPS(uint16)') {
    const decoded = decodeCalldata(calldata, ['uint16']);
    if (decoded) {
      return {
        templateId: 'admin-max-quorum',
        fieldValues: { bps: decoded[0] as string },
        generatedActions: []
      };
    }
  }

  if (signature === '_setQuorumCoefficient(uint32)') {
    const decoded = decodeCalldata(calldata, ['uint32']);
    if (decoded) {
      return {
        templateId: 'admin-quorum-coefficient',
        fieldValues: { coefficient: decoded[0] as string },
        generatedActions: []
      };
    }
  }

  // Fork parameters
  if (signature === '_setForkPeriod(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-fork-period',
        fieldValues: { seconds: decoded[0] as string },
        generatedActions: []
      };
    }
  }

  if (signature === '_setForkThresholdBPS(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-fork-threshold',
        fieldValues: { bps: decoded[0] as string },
        generatedActions: []
      };
    }
  }

  if (signature === '_setForkDAODeployer(address)') {
    const decoded = decodeCalldata(calldata, ['address']);
    if (decoded) {
      return {
        templateId: 'admin-fork-deployer',
        fieldValues: { address: decoded[0] as string },
        generatedActions: []
      };
    }
  }

  if (signature === '_setForkEscrow(address)') {
    const decoded = decodeCalldata(calldata, ['address']);
    if (decoded) {
      return {
        templateId: 'admin-fork-escrow',
        fieldValues: { address: decoded[0] as string },
        generatedActions: []
      };
    }
  }

  if (signature === '_setPendingAdmin(address)') {
    const decoded = decodeCalldata(calldata, ['address']);
    if (decoded) {
      return {
        templateId: 'admin-pending-admin',
        fieldValues: { address: decoded[0] as string },
        generatedActions: []
      };
    }
  }

  return null;
}

/**
 * Decode calldata based on expected types
 * Returns array of decoded values or null if decoding fails
 */
function decodeCalldata(calldata: string, types: string[]): (string | bigint)[] | null {
  try {
    // Remove 0x prefix if present
    const data = calldata.startsWith('0x') ? calldata.slice(2) : calldata;

    if (!data || data === '') return null;

    const results: (string | bigint)[] = [];
    let offset = 0;

    for (const type of types) {
      if (offset >= data.length) return null;

      if (type === 'address') {
        // Address is 32 bytes (64 hex chars), padded to left
        const chunk = data.slice(offset, offset + 64);
        if (chunk.length < 64) return null;
        // Extract address from the last 40 characters
        const address = '0x' + chunk.slice(-40);
        results.push(address);
        offset += 64;
      } else if (type === 'uint256' || type === 'uint96' || type === 'uint32' || type === 'uint16') {
        // uint is 32 bytes (64 hex chars)
        const chunk = data.slice(offset, offset + 64);
        if (chunk.length < 64) return null;
        const value = BigInt('0x' + chunk);
        results.push(value.toString());
        offset += 64;
      }
    }

    return results;
  } catch {
    return null;
  }
}
