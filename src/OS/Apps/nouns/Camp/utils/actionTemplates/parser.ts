/**
 * Action parsing - reverse engineering actions back to templates
 */

import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  ActionTemplateState,
  ProposalAction
} from './types';
import {
  DAO_PROXY_ADDRESS,
  EXTERNAL_CONTRACTS,
  NOUNS_TOKEN_ADDRESS,
  TREASURY_ADDRESS
} from './constants';
import { formatUnits } from './utils';

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

    // Check if this is part of a noun-swap multi-action sequence
    const nounSwapResult = tryMatchNounSwap(actions, i);
    if (nounSwapResult) {
      templateStates.push(nounSwapResult.state);
      nounSwapResult.consumedIndices.forEach(idx => processedIndices.add(idx));
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
  // Treasury ETH transfer (direct value transfer with no function call)
  // Detected by: empty signature, empty calldata, and non-zero value
  if (!signature && (!calldata || calldata === '0x') && value && value !== '0') {
    try {
      return {
        templateId: 'treasury-eth',
        fieldValues: {
          recipient: target, // Target is the recipient
          amount: formatUnits(BigInt(value), 18)
        },
        generatedActions: []
      };
    } catch {
      // Fall through if parsing fails
    }
  }

  // Legacy: Treasury ETH transfer via sendETH (for backwards compatibility)
  if (target === TREASURY_ADDRESS.toLowerCase() && signature === 'sendETH(address,uint256)') {
    const decoded = decodeCalldata(calldata, ['address', 'uint256']);
    if (decoded) {
      return {
        templateId: 'treasury-eth',
        fieldValues: {
          recipient: decoded[0] as string,
          amount: formatUnits(BigInt(decoded[1] as string), 18)
        },
        generatedActions: []
      };
    }
  }

  // USDC transfer (directly on USDC contract)
  if (target === EXTERNAL_CONTRACTS.USDC.address.toLowerCase() && signature === 'transfer(address,uint256)') {
    const decoded = decodeCalldata(calldata, ['address', 'uint256']);
    if (decoded) {
      return {
        templateId: 'treasury-usdc',
        fieldValues: {
          recipient: decoded[0] as string,
          amount: formatUnits(BigInt(decoded[1] as string), 6)
        },
        generatedActions: []
      };
    }
  }

  // WETH transfer (directly on WETH contract)
  if (target === EXTERNAL_CONTRACTS.WETH.address.toLowerCase() && signature === 'transfer(address,uint256)') {
    const decoded = decodeCalldata(calldata, ['address', 'uint256']);
    if (decoded) {
      return {
        templateId: 'treasury-weth',
        fieldValues: {
          recipient: decoded[0] as string,
          amount: formatUnits(BigInt(decoded[1] as string), 18)
        },
        generatedActions: []
      };
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

  // Delegate
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
  const TOKEN_BUYER_ADDRESS = '0x4f2aCdc74f6941390d9b1804faBc3E780388cfe5'.toLowerCase();
  if (target === TOKEN_BUYER_ADDRESS && signature === 'buyETH(uint256)') {
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
  const TOKEN_BUYER_ADDRESS = '0x4f2aCdc74f6941390d9b1804faBc3E780388cfe5'.toLowerCase();

  // Sequence starts with approve(address,uint256) on the USDC contract
  if (target !== USDC_ADDRESS || signature !== 'approve(address,uint256)') return null;

  const approveDecoded = decodeCalldata(action.calldata || '0x', ['address', 'uint256']);
  if (!approveDecoded) return null;

  const spender = (approveDecoded[0] as string).toLowerCase();
  if (spender !== TOKEN_BUYER_ADDRESS) return null;

  // Next action must be buyETH(uint256) on the TokenBuyer
  const nextIndex = startIndex + 1;
  if (nextIndex >= actions.length) return null;

  const nextAction = actions[nextIndex];
  const nextTarget = nextAction.target.toLowerCase();
  const nextSignature = nextAction.signature;

  if (nextTarget !== TOKEN_BUYER_ADDRESS || nextSignature !== 'buyETH(uint256)') return null;

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
