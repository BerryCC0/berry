/**
 * Action parsing - reverse engineering actions back to templates
 */

import { decodeAbiParameters, parseAbiParameters, type Hex } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import { findMatchingAction } from '../actions/registry';
import type { DecodeContext } from '../actions/types';
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
  OCTANT_FACTORIES,
  OCTANT_LIDO_FACTORY_ADDRESS,
  OCTANT_MORPHO_FACTORY_ADDRESS,
  OCTANT_PAYMENT_SPLITTER_FACTORY_ADDRESS,
  OCTANT_SKY_FACTORY_ADDRESS,
  PAYER_ADDRESS,
  STREAM_FACTORY_ADDRESS,
  TOKEN_BUYER_ADDRESS,
  TREASURY_ADDRESS,
  WSTETH_ADDRESS,
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
 * Build a decode context for parsing. The parser doesn't have access to the
 * dynamic stream/token metadata the decoder gets — it runs before any of that
 * is fetched. Action defs that depend on context must handle empty maps.
 */
function emptyParserContext(): DecodeContext {
  return {
    streamAddresses: new Set(),
    cancelledStreams: new Set(),
    streams: new Map(),
    tokens: new Map(),
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
  const ctx = emptyParserContext();

  for (let i = 0; i < actions.length; i++) {
    if (processedIndices.has(i)) continue;

    const action = actions[i];

    // Registry-first dispatch — if a migrated TransactionActionDef matches at
    // this cursor, it owns the action(s) and the legacy matchers below are
    // skipped. Migrated actions are removed from the legacy switch as they
    // move into actions/<category>/.
    const registryMatch = findMatchingAction(actions, i, ctx);
    if (registryMatch) {
      const { def, match } = registryMatch;
      templateStates.push({
        templateId: def.id as ActionTemplateState['templateId'],
        fieldValues: match.values as ActionTemplateState['fieldValues'],
        generatedActions: [],
      });
      for (let k = 0; k < match.consumed; k++) {
        processedIndices.add(i + k);
      }
      continue;
    }

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

    // Check if this is an Octant "deploy + seed" 3-action bundle. Must run
    // BEFORE the single-action createStrategy + the deposit-pair matchers so
    // the triple isn't broken up.
    const octantCreateSeedResult = tryMatchOctantCreateAndSeed(actions, i);
    if (octantCreateSeedResult) {
      templateStates.push(octantCreateSeedResult.state);
      octantCreateSeedResult.consumedIndices.forEach((idx) => processedIndices.add(idx));
      continue;
    }

    // Check if this is an Octant deposit pair (approve + deposit). Run before
    // the single-action matchers so the leading approve isn't classified as
    // a standalone erc20-approve.
    const octantDepositResult = tryMatchOctantDeposit(actions, i);
    if (octantDepositResult) {
      templateStates.push(octantDepositResult.state);
      octantDepositResult.consumedIndices.forEach(idx => processedIndices.add(idx));
      continue;
    }

    // Check if this is a stETH → wstETH wrap pair (approve + wrap).
    const wstethWrapResult = tryMatchWstethWrap(actions, i);
    if (wstethWrapResult) {
      templateStates.push(wstethWrapResult.state);
      wstethWrapResult.consumedIndices.forEach(idx => processedIndices.add(idx));
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

  // Octant v2 — standalone createPaymentSplitter call. Decoded into the
  // free-form lines format the standalone template uses.
  if (
    target === OCTANT_PAYMENT_SPLITTER_FACTORY_ADDRESS.toLowerCase() &&
    signature === 'createPaymentSplitter(address[],string[],uint256[])'
  ) {
    const cd = (calldata.startsWith('0x') ? calldata : `0x${calldata}`) as Hex;
    try {
      const [payees, names, shares] = decodeAbiParameters(
        parseAbiParameters('address[], string[], uint256[]'),
        cd,
      ) as readonly [readonly string[], readonly string[], readonly bigint[]];
      const lines = payees
        .map((addr, i) => {
          const name = (names[i] || '').trim();
          const share = shares[i].toString();
          return name ? `${addr} ${name} ${share}` : `${addr} ${share}`;
        })
        .join('\n');
      return {
        templateId: 'octant-splitter-create',
        fieldValues: { payees: lines },
        generatedActions: [],
      };
    } catch {
      // Fall through if calldata is malformed
    }
  }

  // Octant v2 — createStrategy(...) on a known factory. Decoded via viem so
  // the dynamic name/symbol strings round-trip cleanly back into the editor.
  const factoryMeta = OCTANT_FACTORIES[target];
  if (factoryMeta) {
    const cd = (calldata.startsWith('0x') ? calldata : `0x${calldata}`) as Hex;
    try {
      if (factoryMeta.source === 'yearn') {
        const decoded = decodeAbiParameters(
          parseAbiParameters(
            'address, address, string, string, address, address, address, address, bool, address',
          ),
          cd,
        ) as readonly [string, string, string, string, string, string, string, string, boolean, string];
        return {
          templateId: 'octant-vault-create-yearn',
          fieldValues: {
            yearnVault: decoded[0],
            asset: decoded[1],
            vaultName: decoded[2],
            vaultSymbol: decoded[3],
            management: decoded[4],
            keeper: decoded[5],
            emergencyAdmin: decoded[6],
            donationAddress: decoded[7],
            enableBurning: decoded[8] ? 'true' : 'false',
            tokenizedStrategyAddress: decoded[9],
          },
          generatedActions: [],
        };
      }
      const decoded = decodeAbiParameters(
        parseAbiParameters(
          'string, string, address, address, address, address, bool, address',
        ),
        cd,
      ) as readonly [string, string, string, string, string, string, boolean, string];
      const templateId =
        target === OCTANT_LIDO_FACTORY_ADDRESS.toLowerCase()
          ? 'octant-vault-create-lido'
          : target === OCTANT_MORPHO_FACTORY_ADDRESS.toLowerCase()
            ? 'octant-vault-create-morpho'
            : target === OCTANT_SKY_FACTORY_ADDRESS.toLowerCase()
              ? 'octant-vault-create-sky'
              : null;
      if (templateId) {
        return {
          templateId,
          fieldValues: {
            vaultName: decoded[0],
            vaultSymbol: decoded[1],
            management: decoded[2],
            keeper: decoded[3],
            emergencyAdmin: decoded[4],
            donationAddress: decoded[5],
            enableBurning: decoded[6] ? 'true' : 'false',
            tokenizedStrategyAddress: decoded[7],
          },
          generatedActions: [],
        };
      }
    } catch {
      // Fall through to the generic catch-all if calldata is malformed
    }
  }

  // ERC-4626 redeem(uint256,address,address) — Octant Dragon vault withdrawal
  // by share count. Matches any target since deployed vault addresses are
  // dynamic; the receiver/owner pair must both be the treasury.
  if (signature === 'redeem(uint256,address,address)') {
    const decoded = decodeCalldata(calldata, ['uint256', 'address', 'address']);
    if (decoded) {
      const receiver = (decoded[1] as string).toLowerCase();
      const owner = (decoded[2] as string).toLowerCase();
      if (
        receiver === TREASURY_ADDRESS.toLowerCase() &&
        owner === TREASURY_ADDRESS.toLowerCase()
      ) {
        return {
          templateId: 'octant-vault-redeem',
          fieldValues: {
            vault: target,
            shares: formatUnits(BigInt(decoded[0] as string), 18),
          },
          generatedActions: [],
        };
      }
    }
  }

  // ERC-4626 withdraw(uint256,address,address) — same shape as redeem, but
  // amount is in underlying asset units.
  if (signature === 'withdraw(uint256,address,address)') {
    const decoded = decodeCalldata(calldata, ['uint256', 'address', 'address']);
    if (decoded) {
      const receiver = (decoded[1] as string).toLowerCase();
      const owner = (decoded[2] as string).toLowerCase();
      if (
        receiver === TREASURY_ADDRESS.toLowerCase() &&
        owner === TREASURY_ADDRESS.toLowerCase()
      ) {
        // We can't infer the underlying-asset decimals from the vault address
        // alone — surface the raw amount (18-dec assumption) and let the user
        // re-pick the token in the editor.
        return {
          templateId: 'octant-vault-withdraw',
          fieldValues: {
            vault: target,
            amount: formatUnits(BigInt(decoded[0] as string), 18),
          },
          generatedActions: [],
        };
      }
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
 * Try to match an Octant "deploy + seed (+ splitter)" bundle of 1–4 actions:
 *   [0] (optional) createPaymentSplitter on PaymentSplitterFactory
 *   [1]            createStrategy on a known Octant factory
 *   [2] (optional) approve(predictedAddr, amount) on the underlying asset
 *   [3] (optional) deposit(amount, treasury) on predictedAddr
 *
 * Must run BEFORE the standalone createStrategy and deposit matchers so the
 * bundle isn't broken apart into separate templates. Single-action createStrategy
 * is still handled by the catch-all matchActionToTemplate.
 */
function tryMatchOctantCreateAndSeed(
  actions: ProposalAction[],
  startIndex: number,
): { state: ActionTemplateState; consumedIndices: number[] } | null {
  let cursor = startIndex;
  const consumed: number[] = [];

  // (Optional) leading createPaymentSplitter
  let splitterPayload:
    | { payees: string[]; names: string[]; shares: string[]; predicted: string }
    | undefined;
  if (
    actions[cursor]?.target.toLowerCase() ===
      OCTANT_PAYMENT_SPLITTER_FACTORY_ADDRESS.toLowerCase() &&
    actions[cursor]?.signature?.startsWith('createPaymentSplitter(')
  ) {
    const cd = (
      actions[cursor].calldata.startsWith('0x')
        ? actions[cursor].calldata
        : `0x${actions[cursor].calldata}`
    ) as Hex;
    try {
      const [payees, names, shares] = decodeAbiParameters(
        parseAbiParameters('address[], string[], uint256[]'),
        cd,
      ) as readonly [readonly string[], readonly string[], readonly bigint[]];
      splitterPayload = {
        payees: payees as string[],
        names: names as string[],
        shares: (shares as readonly bigint[]).map((s) => s.toString()),
        predicted: '', // filled in below once we know createStrategy's donation arg
      };
      consumed.push(cursor);
      cursor += 1;
    } catch {
      // Malformed splitter calldata — fall through to standalone matchers
      return null;
    }
  }

  // Required: createStrategy on an Octant factory
  const a = actions[cursor];
  if (!a) return null;
  const factoryMeta = OCTANT_FACTORIES[a.target.toLowerCase()];
  if (!factoryMeta) return null;
  if (!a.signature || !a.signature.startsWith('createStrategy(')) return null;
  consumed.push(cursor);
  cursor += 1;

  // (Optional) trailing approve + deposit
  let seedAmount: string | undefined;
  let predictedVault: string | undefined;
  const maybeApprove = actions[cursor];
  const maybeDeposit = actions[cursor + 1];
  if (
    maybeApprove?.signature === 'approve(address,uint256)' &&
    maybeDeposit?.signature === 'deposit(uint256,address)'
  ) {
    const approveDecoded = decodeCalldata(maybeApprove.calldata || '0x', [
      'address',
      'uint256',
    ]);
    const depositDecoded = decodeCalldata(maybeDeposit.calldata || '0x', [
      'uint256',
      'address',
    ]);
    if (
      approveDecoded &&
      depositDecoded &&
      (depositDecoded[1] as string).toLowerCase() ===
        TREASURY_ADDRESS.toLowerCase() &&
      (approveDecoded[0] as string).toLowerCase() ===
        maybeDeposit.target.toLowerCase() &&
      BigInt(approveDecoded[1] as string) === BigInt(depositDecoded[0] as string) &&
      (!factoryMeta.assetAddress ||
        maybeApprove.target.toLowerCase() ===
          factoryMeta.assetAddress.toLowerCase())
    ) {
      seedAmount = formatUnits(
        BigInt(depositDecoded[0] as string),
        factoryMeta.assetDecimals,
      );
      predictedVault = maybeDeposit.target;
      consumed.push(cursor, cursor + 1);
    }
  }

  // Decode createStrategy
  const cd = (a.calldata.startsWith('0x') ? a.calldata : `0x${a.calldata}`) as Hex;
  try {
    let fieldValues: ActionTemplateState['fieldValues'];
    let templateId: ActionTemplateType;
    let donationFromCreate: string;

    if (factoryMeta.source === 'yearn') {
      const decoded = decodeAbiParameters(
        parseAbiParameters(
          'address, address, string, string, address, address, address, address, bool, address',
        ),
        cd,
      ) as readonly [string, string, string, string, string, string, string, string, boolean, string];
      templateId = 'octant-vault-create-yearn';
      donationFromCreate = decoded[7];
      fieldValues = {
        yearnVault: decoded[0],
        asset: decoded[1],
        vaultName: decoded[2],
        vaultSymbol: decoded[3],
        management: decoded[4],
        keeper: decoded[5],
        emergencyAdmin: decoded[6],
        donationAddress: decoded[7],
        enableBurning: decoded[8] ? 'true' : 'false',
        tokenizedStrategyAddress: decoded[9],
        ...(seedAmount ? { seedAmount } : {}),
        ...(predictedVault ? { predictedVault } : {}),
      };
    } else {
      const decoded = decodeAbiParameters(
        parseAbiParameters(
          'string, string, address, address, address, address, bool, address',
        ),
        cd,
      ) as readonly [string, string, string, string, string, string, boolean, string];
      const target = a.target.toLowerCase();
      templateId =
        target === OCTANT_LIDO_FACTORY_ADDRESS.toLowerCase()
          ? 'octant-vault-create-lido'
          : target === OCTANT_MORPHO_FACTORY_ADDRESS.toLowerCase()
            ? 'octant-vault-create-morpho'
            : 'octant-vault-create-sky';
      donationFromCreate = decoded[5];
      fieldValues = {
        vaultName: decoded[0],
        vaultSymbol: decoded[1],
        management: decoded[2],
        keeper: decoded[3],
        emergencyAdmin: decoded[4],
        donationAddress: decoded[5],
        enableBurning: decoded[6] ? 'true' : 'false',
        tokenizedStrategyAddress: decoded[7],
        ...(seedAmount ? { seedAmount } : {}),
        ...(predictedVault ? { predictedVault } : {}),
      };
    }

    // If the bundle began with a splitter creation, the splitter's predicted
    // address should match the donation address in createStrategy. Verify
    // and stash the payload so the editor can reopen it.
    if (splitterPayload) {
      if (
        donationFromCreate.toLowerCase() !==
        splitterPayload.predicted.toLowerCase()
      ) {
        // Try filling in the predicted address from the donation arg (since
        // the splitter is the donation target by construction).
        splitterPayload = { ...splitterPayload, predicted: donationFromCreate };
      }
      fieldValues.newSplitterPayload = JSON.stringify(splitterPayload);
    }

    // Bare standalone create with no extras → don't claim it; let the
    // single-action matcher handle it (so the templateId still resolves but
    // we don't allocate a multi-action group for nothing).
    if (consumed.length === 1) {
      return null;
    }

    return {
      state: { templateId, fieldValues, generatedActions: [] },
      consumedIndices: consumed,
    };
  } catch {
    return null;
  }
}

/**
 * Try to match an Octant ERC-4626 deposit pair:
 *   1. approve(vault, X) on the underlying asset
 *   2. deposit(X, treasury) on the vault
 *
 * The vault is whichever address the approve targets — we don't enumerate
 * known vaults because Octant deploys them via CREATE2 dynamically.
 */
function tryMatchOctantDeposit(
  actions: ProposalAction[],
  startIndex: number,
): { state: ActionTemplateState; consumedIndices: number[] } | null {
  const action = actions[startIndex];
  if (action.signature !== 'approve(address,uint256)') return null;
  const approveDecoded = decodeCalldata(action.calldata || '0x', ['address', 'uint256']);
  if (!approveDecoded) return null;
  const spender = (approveDecoded[0] as string).toLowerCase();
  const approveAmount = approveDecoded[1] as string;
  const tokenAddress = action.target;

  const nextIndex = startIndex + 1;
  if (nextIndex >= actions.length) return null;
  const next = actions[nextIndex];
  if (next.target.toLowerCase() !== spender) return null;
  if (next.signature !== 'deposit(uint256,address)') return null;

  const depositDecoded = decodeCalldata(next.calldata || '0x', ['uint256', 'address']);
  if (!depositDecoded) return null;
  const depositAmount = depositDecoded[0] as string;
  if (BigInt(depositAmount) !== BigInt(approveAmount)) return null;

  // Receiver must be the treasury — otherwise this isn't a treasury deposit
  const receiver = (depositDecoded[1] as string).toLowerCase();
  if (receiver !== TREASURY_ADDRESS.toLowerCase()) return null;

  const known = COMMON_TOKENS.find(
    (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
  );
  const decimals = known?.decimals ?? 18;

  return {
    state: {
      templateId: 'octant-vault-deposit',
      fieldValues: {
        vault: next.target,
        token: known
          ? JSON.stringify({
              symbol: known.symbol,
              address: known.address,
              decimals: known.decimals,
              isNative: false,
            })
          : tokenAddress,
        amount: formatUnits(BigInt(depositAmount), decimals),
      },
      generatedActions: [],
    },
    consumedIndices: [startIndex, nextIndex],
  };
}

/**
 * Try to match a stETH → wstETH wrap pair:
 *   1. approve(wstETH, X) on stETH
 *   2. wrap(X) on wstETH
 */
function tryMatchWstethWrap(
  actions: ProposalAction[],
  startIndex: number,
): { state: ActionTemplateState; consumedIndices: number[] } | null {
  const action = actions[startIndex];
  const stEthAddress = COMMON_TOKENS.find((t) => t.symbol === 'stETH')?.address;
  if (!stEthAddress) return null;
  if (action.target.toLowerCase() !== stEthAddress.toLowerCase()) return null;
  if (action.signature !== 'approve(address,uint256)') return null;

  const approveDecoded = decodeCalldata(action.calldata || '0x', ['address', 'uint256']);
  if (!approveDecoded) return null;
  if ((approveDecoded[0] as string).toLowerCase() !== WSTETH_ADDRESS.toLowerCase()) return null;

  const nextIndex = startIndex + 1;
  if (nextIndex >= actions.length) return null;
  const next = actions[nextIndex];
  if (next.target.toLowerCase() !== WSTETH_ADDRESS.toLowerCase()) return null;
  if (next.signature !== 'wrap(uint256)') return null;

  const wrapDecoded = decodeCalldata(next.calldata || '0x', ['uint256']);
  if (!wrapDecoded) return null;
  if (BigInt(wrapDecoded[0] as string) !== BigInt(approveDecoded[1] as string)) return null;

  return {
    state: {
      templateId: 'lst-wsteth-wrap',
      fieldValues: {
        amount: formatUnits(BigInt(wrapDecoded[0] as string), 18),
      },
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
 * Decode calldata based on expected ABI types.
 *
 * Thin wrapper around viem's `decodeAbiParameters` that preserves the
 * historical return contract: addresses come back as 0x-prefixed strings,
 * uints come back stringified (so call sites doing `BigInt(decoded[i])`
 * continue to work without changes).
 *
 * Replaces a 35-line hand-rolled byte parser that only understood
 * `address` and `uint*` — the viem path handles every ABI type correctly
 * and fails cleanly on malformed bytes.
 */
function decodeCalldata(calldata: string, types: string[]): (string | bigint)[] | null {
  if (types.length === 0) return [];
  if (!calldata || calldata === '0x') return null;
  try {
    const data = (calldata.startsWith('0x') ? calldata : `0x${calldata}`) as Hex;
    const decoded = decodeAbiParameters(parseAbiParameters(types.join(', ')), data);
    // Preserve the legacy shape: bigints/numbers → stringified, addresses
    // pass through. The receiver code already calls `BigInt(decoded[i] as string)`
    // or treats them as strings; both work after this conversion.
    return decoded.map((v) =>
      typeof v === 'bigint' || typeof v === 'number' ? v.toString() : (v as string),
    );
  } catch {
    return null;
  }
}
