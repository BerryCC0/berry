/**
 * Transaction Decoder
 * Decodes proposal transactions into human-readable descriptions
 */

import { decodeAbiParameters, formatUnits, type Hex } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';
import { formatAddress, truncateAddress } from '@/shared/format';

// Known contract addresses with human-readable names
const KNOWN_CONTRACTS: Record<string, string> = {
  [NOUNS_ADDRESSES.token.toLowerCase()]: 'Nouns Token',
  [NOUNS_ADDRESSES.auctionHouse.toLowerCase()]: 'Auction House',
  [NOUNS_ADDRESSES.governor.toLowerCase()]: 'Nouns DAO',
  [NOUNS_ADDRESSES.treasury.toLowerCase()]: 'Treasury',
  [NOUNS_ADDRESSES.treasuryV1.toLowerCase()]: 'Treasury V1',
  [NOUNS_ADDRESSES.data.toLowerCase()]: 'Nouns DAO Data',
  [NOUNS_ADDRESSES.tokenBuyer.toLowerCase()]: 'Token Buyer',
  [NOUNS_ADDRESSES.payer.toLowerCase()]: 'Nouns DAO Payer',
  [NOUNS_ADDRESSES.streamFactory.toLowerCase()]: 'Stream Factory',
  [NOUNS_ADDRESSES.descriptor.toLowerCase()]: 'Nouns Descriptor',
  // Common tokens
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': 'stETH',
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': 'wstETH',
  '0xae78736cd615f374d3085123a210448e74fc6393': 'rETH',
  // Nouns ecosystem
  '0x65294e6b55a9939e326c1b51b03bb4bd3ca5e675': 'delegations.nouns.eth',
};

// Token decimals
const TOKEN_DECIMALS: Record<string, number> = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6, // USDC
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 18, // WETH
  '0x6b175474e89094c44da98b954eedeac495271d0f': 18, // DAI
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': 18, // stETH
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': 18, // wstETH
  '0xae78736cd615f374d3085123a210448e74fc6393': 18, // rETH
};

const TOKEN_SYMBOLS: Record<string, string> = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': 'stETH',
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': 'wstETH',
  '0xae78736cd615f374d3085123a210448e74fc6393': 'rETH',
  // ERC20Votes governance tokens (no decimals lookup needed for display)
  '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72': 'ENS',
  '0xc00e94cb662c3520282e6f5717214004a7f26888': 'COMP',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'UNI',
  '0x912ce59144191c1204e64559fe8253a0e49e6548': 'ARB',
};

export interface DecodedTransaction {
  title: string;
  description?: string;
  target: string;
  targetName?: string;
  functionName: string;
  value: string;
  // Parsed parameters for display
  params?: Record<string, string>;
  // Formatted function call for unknown contracts
  formattedCall?: string[];
  // ETH value formatted
  ethValue?: string;
}

interface ProposalAction {
  target: string;
  value: string;
  signature: string;
  calldata: string;
}

function getContractName(address: string): string | undefined {
  return KNOWN_CONTRACTS[address.toLowerCase()];
}


/**
 * Format a parameter value for display
 * Handles addresses, bigints, strings, booleans, arrays
 */
function formatParamValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  
  // Handle addresses
  if (typeof value === 'string' && value.startsWith('0x') && value.length === 42) {
    const knownName = getContractName(value);
    return knownName || truncateAddress(value);
  }
  
  // Handle other hex strings (bytes)
  if (typeof value === 'string' && value.startsWith('0x')) {
    if (value.length > 66) {
      return `${value.slice(0, 10)}...${value.slice(-8)}`;
    }
    return value;
  }
  
  // Handle strings
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  
  // Handle bigints
  if (typeof value === 'bigint') {
    // Check if it looks like an ETH amount (18 decimals, reasonable size)
    const absValue = value < BigInt(0) ? -value : value;
    if (absValue >= BigInt('1000000000000000') && absValue < BigInt('1000000000000000000000000')) {
      // Likely ETH or similar 18-decimal token
      const ethValue = formatUnits(value, 18);
      const num = parseFloat(ethValue);
      if (num >= 0.001 && num < 1000000) {
        return `${value.toString()} // ${num} ETH`;
      }
    }
    return value.toString();
  }
  
  // Handle numbers
  if (typeof value === 'number') {
    return value.toString();
  }
  
  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length <= 3) {
      return `[${value.map(v => formatParamValue(v)).join(', ')}]`;
    }
    return `[${value.length} items]`;
  }
  
  // Fallback
  return String(value);
}

/**
 * Build a formatted function call representation
 */
function buildFormattedCall(
  target: string,
  functionName: string,
  signature: string,
  params: Record<string, unknown> | null,
  value: string
): string[] {
  const lines: string[] = [];
  const targetDisplay = getContractName(target) || formatAddress(target);
  
  // First line: target.functionName(
  lines.push(`${targetDisplay}.${functionName}(`);
  
  // Parameter lines
  if (params) {
    let i = 0;
    while (params[`param${i}`] !== undefined) {
      const paramValue = params[`param${i}`];
      const formattedValue = formatParamValue(paramValue);
      const isLast = params[`param${i + 1}`] === undefined;
      lines.push(`  ${formattedValue}${isLast ? '' : ','}`);
      i++;
    }
  }
  
  // Closing paren
  lines.push(')');
  
  // Value line if ETH is being sent
  const ethValue = BigInt(value);
  if (ethValue > BigInt(0)) {
    const formatted = formatUnits(ethValue, 18);
    lines.push(`value: ${value} // ${parseFloat(formatted)} ETH`);
  }
  
  return lines;
}

export function formatTokenAmount(amount: bigint, decimals: number): string {
  const formatted = formatUnits(amount, decimals);
  const num = parseFloat(formatted);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

function tryDecodeParams(signature: string, calldata: string): Record<string, unknown> | null {
  if (!signature || !calldata || calldata === '0x') return null;
  
  try {
    // Extract parameter types from signature
    const match = signature.match(/\((.+)\)$/);
    if (!match) return null;
    
    const paramTypesStr = match[1];
    const paramTypes = parseParamTypes(paramTypesStr);
    
    if (paramTypes.length === 0) return null;
    
    // Decode the calldata
    const decoded = decodeAbiParameters(
      paramTypes.map((type, i) => ({ type, name: `param${i}` })),
      calldata as Hex
    );
    
    return Object.fromEntries(decoded.map((v, i) => [`param${i}`, v]));
  } catch {
    return null;
  }
}

function parseParamTypes(paramTypesStr: string): string[] {
  // Simple parser for common param types
  const types: string[] = [];
  let depth = 0;
  let current = '';
  
  for (const char of paramTypesStr) {
    if (char === '(' || char === '[') depth++;
    if (char === ')' || char === ']') depth--;
    
    if (char === ',' && depth === 0) {
      types.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    types.push(current.trim());
  }
  
  return types;
}

/**
 * Try to decode known Nouns DAO governance functions into human-readable descriptions.
 * Returns true if matched and decoded was mutated, false otherwise.
 */
function tryDecodeGovernanceFunction(
  functionName: string,
  params: Record<string, unknown> | null,
  decoded: DecodedTransaction
): boolean {
  // BPS-based settings (basis points: 100 BPS = 1%)
  const bpsSettings: Record<string, string> = {
    '_setMinQuorumVotesBPS': 'Set min quorum',
    '_setMaxQuorumVotesBPS': 'Set max quorum',
    '_setProposalThresholdBPS': 'Set proposal threshold',
    '_setForkThresholdBPS': 'Set fork threshold',
  };

  if (bpsSettings[functionName] && params) {
    const bps = Number(params.param0);
    const pct = bps % 100 === 0 ? `${bps / 100}` : `${(bps / 100).toFixed(2).replace(/0+$/, '')}`;
    decoded.title = `${bpsSettings[functionName]} to ${pct}%`;
    decoded.description = 'Nouns DAO Governance';
    return true;
  }

  // Block-based settings
  const blockSettings: Record<string, string> = {
    '_setVotingDelay': 'Set voting delay',
    '_setVotingPeriod': 'Set voting period',
    '_setObjectionPeriodDurationInBlocks': 'Set objection period',
    '_setLastMinuteWindowInBlocks': 'Set last-minute window',
    '_setProposalUpdatablePeriodInBlocks': 'Set proposal updatable period',
  };

  if (blockSettings[functionName] && params) {
    const blocks = Number(params.param0);
    decoded.title = `${blockSettings[functionName]} to ${blocks.toLocaleString()} blocks`;
    decoded.description = 'Nouns DAO Governance';
    return true;
  }

  // Quorum coefficient
  if (functionName === '_setQuorumCoefficient' && params) {
    decoded.title = `Set quorum coefficient to ${Number(params.param0)}`;
    decoded.description = 'Nouns DAO Governance';
    return true;
  }

  // Fork period (param is seconds)
  if (functionName === '_setForkPeriod' && params) {
    const seconds = Number(params.param0);
    const days = Math.round(seconds / 86400);
    decoded.title = `Set fork period to ${days} day${days !== 1 ? 's' : ''}`;
    decoded.description = 'Nouns DAO Governance';
    return true;
  }

  // Simple governance actions (no numeric params to format)
  const simpleGovernance: Record<string, string> = {
    '_setForkDAODeployer': 'Set fork DAO deployer',
    '_setErc20TokensToIncludeInFork': 'Set fork ERC-20 tokens',
    '_setTimelocksAndAdmin': 'Set timelocks and admin',
    '_burnVetoPower': 'Burn veto power',
    '_setPendingVetoer': 'Set pending vetoer',
  };

  if (simpleGovernance[functionName]) {
    decoded.title = simpleGovernance[functionName];
    decoded.description = 'Nouns DAO Governance';
    return true;
  }

  return false;
}

/**
 * Try to decode known Nouns Descriptor functions into human-readable descriptions.
 * Returns true if matched and decoded was mutated, false otherwise.
 */
function tryDecodeDescriptorFunction(
  functionName: string,
  params: Record<string, unknown> | null,
  decoded: DecodedTransaction
): boolean {
  // Trait addition functions: addHeads(bytes,uint80,uint16), etc. — param2 is the image count
  const traitTypes: Record<string, [string, string]> = {
    'addHeads': ['head', 'heads'],
    'addBodies': ['body', 'bodies'],
    'addAccessories': ['accessory', 'accessories'],
    'addGlasses': ['glasses', 'glasses'],
    'addBackgrounds': ['background', 'backgrounds'],
  };

  if (traitTypes[functionName]) {
    const [singular, plural] = traitTypes[functionName];
    // For addBackgrounds, param0 is string[] — use its length
    // For others, param2 (uint16) is the image count
    let count = 0;
    if (functionName === 'addBackgrounds' && params) {
      const arr = params.param0;
      count = Array.isArray(arr) ? arr.length : 0;
    } else if (params) {
      count = Number(params.param2) || 0;
    }

    if (count > 0) {
      const label = count === 1 ? singular : plural;
      decoded.title = `Add ${count} new ${label}`;
    } else {
      decoded.title = `Add new ${plural}`;
    }
    decoded.description = 'Nouns Artwork';
    return true;
  }

  // Palette functions
  if (functionName === 'setPalette' || functionName === 'addPalette') {
    decoded.title = functionName === 'setPalette' ? 'Update color palette' : 'Add color palette';
    decoded.description = 'Nouns Artwork';
    return true;
  }

  // Descriptor upgrade / toggle
  if (functionName === 'setArt' || functionName === 'setRenderer' || functionName === 'setArtDescriptor') {
    decoded.title = 'Update art renderer';
    decoded.description = 'Nouns Artwork';
    return true;
  }

  if (functionName === 'toggleDataURIEnabled') {
    decoded.title = 'Toggle on-chain art rendering';
    decoded.description = 'Nouns Artwork';
    return true;
  }

  if (functionName === 'setBaseURI') {
    decoded.title = 'Set base URI for off-chain art';
    decoded.description = 'Nouns Artwork';
    return true;
  }

  return false;
}

/**
 * Try to decode known Nouns Auction House functions into human-readable descriptions.
 * Returns true if matched and decoded was mutated, false otherwise.
 */
function tryDecodeAuctionFunction(
  functionName: string,
  params: Record<string, unknown> | null,
  actionValue: string,
  decoded: DecodedTransaction
): boolean {
  // setReservePrice(uint192) — param is in wei
  if (functionName === 'setReservePrice' && params) {
    const wei = BigInt(String(params.param0));
    const eth = parseFloat(formatUnits(wei, 18));
    decoded.title = `Set auction reserve price to ${eth} ETH`;
    decoded.description = 'Auction House';
    return true;
  }

  // setTimeBuffer(uint56) — param is seconds
  if (functionName === 'setTimeBuffer' && params) {
    const seconds = Number(params.param0);
    const minutes = Math.round(seconds / 60);
    decoded.title = minutes > 0
      ? `Set auction time buffer to ${minutes} min`
      : `Set auction time buffer to ${seconds}s`;
    decoded.description = 'Auction House';
    return true;
  }

  // setMinBidIncrementPercentage(uint8)
  if (functionName === 'setMinBidIncrementPercentage' && params) {
    decoded.title = `Set min bid increment to ${Number(params.param0)}%`;
    decoded.description = 'Auction House';
    return true;
  }

  // createBid(uint256) or createBid(uint256,uint32) — ETH value is in action.value
  if (functionName === 'createBid') {
    const ethValue = BigInt(actionValue);
    if (ethValue > BigInt(0)) {
      const eth = parseFloat(formatUnits(ethValue, 18));
      decoded.title = `Bid ${eth} ETH on Noun auction`;
    } else {
      decoded.title = 'Bid on Noun auction';
    }
    decoded.description = 'Auction House';
    return true;
  }

  // settleCurrentAndCreateNewAuction / settleAuction
  if (functionName === 'settleCurrentAndCreateNewAuction') {
    decoded.title = 'Settle auction and start new one';
    decoded.description = 'Auction House';
    return true;
  }
  if (functionName === 'settleAuction') {
    decoded.title = 'Settle current auction';
    decoded.description = 'Auction House';
    return true;
  }

  // pause / unpause
  if (functionName === 'pause') {
    decoded.title = 'Pause auctions';
    decoded.description = 'Auction House';
    return true;
  }
  if (functionName === 'unpause') {
    decoded.title = 'Unpause auctions';
    decoded.description = 'Auction House';
    return true;
  }

  // setSanctionsOracle
  if (functionName === 'setSanctionsOracle') {
    decoded.title = 'Set sanctions oracle';
    decoded.description = 'Auction House';
    return true;
  }

  return false;
}

/**
 * Decode a proposal action into a human-readable description
 */
export function decodeTransaction(action: ProposalAction): DecodedTransaction {
  const target = action.target.toLowerCase();
  const targetName = getContractName(target);
  const signature = action.signature || '';
  
  // Extract function name from signature
  const functionMatch = signature.match(/^(\w+)\(/);
  const functionName = functionMatch ? functionMatch[1] : 'Unknown';
  
  // Try to decode parameters
  const params = signature ? tryDecodeParams(signature, action.calldata) : null;
  
  // Build decoded transaction
  const decoded: DecodedTransaction = {
    title: functionName,
    target: action.target,
    targetName,
    functionName,
    value: action.value,
  };
  
  // Try to create a human-readable title based on known patterns
  
  // ETH Transfer (no signature, just value)
  if (!signature && BigInt(action.value) > BigInt(0)) {
    const ethAmount = formatUnits(BigInt(action.value), 18);
    decoded.title = `Transfer ${parseFloat(ethAmount).toLocaleString()} ETH`;
    decoded.params = { to: action.target };
    return decoded;
  }
  
  // ERC20 Transfer: transfer(address,uint256)
  if (signature === 'transfer(address,uint256)' && params) {
    const to = params.param0 as string;
    const amount = params.param1 as bigint;
    const symbol = TOKEN_SYMBOLS[target] || 'tokens';
    const decimals = TOKEN_DECIMALS[target] || 18;
    const formattedAmount = formatTokenAmount(amount, decimals);
    
    decoded.title = `Transfer ${formattedAmount} ${symbol}`;
    decoded.params = { to };
    return decoded;
  }
  
  // ERC20 Approve: approve(address,uint256)
  if (signature === 'approve(address,uint256)' && params) {
    const spender = params.param0 as string;
    const amount = params.param1 as bigint;
    const symbol = TOKEN_SYMBOLS[target] || 'tokens';
    const decimals = TOKEN_DECIMALS[target] || 18;
    const spenderName = getContractName(spender as string);
    
    if (amount === BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')) {
      decoded.title = `Approve unlimited ${symbol}`;
    } else {
      const formattedAmount = formatTokenAmount(amount, decimals);
      decoded.title = `Approve ${formattedAmount} ${symbol}`;
    }
    decoded.description = `Spender: ${spenderName || formatAddress(spender)}`;
    return decoded;
  }
  
  // Stream Factory: createStream(recipient, amount, tokenAddress, startTime, endTime, nonce, predictedStreamAddress)
  if (signature.startsWith('createStream(') && params) {
    const recipient = params.param0 as string;  // recipient is param0
    const tokenAmount = params.param1 as bigint;
    const tokenAddress = (params.param2 as string)?.toLowerCase();  // token is param2
    const startTime = params.param3 as bigint;
    const endTime = params.param4 as bigint;
    
    const symbol = TOKEN_SYMBOLS[tokenAddress] || 'tokens';
    const decimals = TOKEN_DECIMALS[tokenAddress] || 18;
    
    if (tokenAmount && startTime && endTime) {
      const formattedAmount = formatTokenAmount(tokenAmount, decimals);
      const startDate = formatDate(startTime);
      const endDate = formatDate(endTime);
      
      // Calculate duration in months
      const durationMs = (Number(endTime) - Number(startTime)) * 1000;
      const months = Math.round(durationMs / (30 * 24 * 60 * 60 * 1000));
      
      decoded.title = `Stream ${formattedAmount} ${symbol}`;
      decoded.description = `${startDate} to ${endDate} (${months} months)`;
      decoded.params = { to: recipient };
      return decoded;
    }
  }
  
  // Payer: sendOrRegisterDebt(address,uint256)
  if (signature === 'sendOrRegisterDebt(address,uint256)' && params) {
    const recipient = params.param0 as string;
    const amount = params.param1 as bigint;
    
    // Payer deals with USDC (6 decimals)
    const formattedAmount = formatTokenAmount(amount, 6);
    
    decoded.title = `Fund via Payer`;
    decoded.description = `${formattedAmount} USDC`;
    decoded.params = { to: recipient };
    return decoded;
  }
  
  // Nouns Token: transferFrom(from, to, tokenId) or safeTransferFrom
  if ((signature.startsWith('transferFrom(') || signature.startsWith('safeTransferFrom(')) && 
      target === NOUNS_ADDRESSES.token.toLowerCase() && params) {
    const from = params.param0 as string;
    const to = params.param1 as string;
    const tokenId = params.param2 as bigint;
    
    decoded.title = `Transfer Noun ${tokenId}`;
    decoded.params = { from, to, nounId: tokenId.toString() };
    return decoded;
  }
  
  // Nouns Token: delegate(address)
  if (signature === 'delegate(address)' &&
      target === NOUNS_ADDRESSES.token.toLowerCase() && params) {
    const delegatee = params.param0 as string;

    decoded.title = `Delegate Nouns voting power`;
    decoded.params = { to: delegatee };
    return decoded;
  }

  // Generic ERC20Votes delegate — ENS, COMP, UNI, etc.
  if (signature === 'delegate(address)' && params) {
    const delegatee = params.param0 as string;
    const symbol = TOKEN_SYMBOLS[target] || getContractName(target) || 'token';
    decoded.title = `Delegate ${symbol} voting power`;
    decoded.params = { to: delegatee };
    return decoded;
  }
  
  // Token Buyer: buyETH(uint256)
  if (signature === 'buyETH(uint256)' && params) {
    const usdcAmount = params.param0 as bigint;
    const formattedAmount = formatUnits(usdcAmount, 6);
    
    decoded.title = `Buy ETH with ${parseFloat(formattedAmount).toLocaleString()} USDC`;
    decoded.description = `Via Token Buyer`;
    return decoded;
  }
  
  // DAO Governance: known admin/config functions on the governor contract
  if (target === NOUNS_ADDRESSES.governor.toLowerCase()) {
    if (tryDecodeGovernanceFunction(functionName, params, decoded)) {
      if (signature) {
        decoded.formattedCall = buildFormattedCall(
          action.target, functionName, signature, params, action.value
        );
      }
      return decoded;
    }
  }

  // Auction House functions
  if (target === NOUNS_ADDRESSES.auctionHouse.toLowerCase()) {
    if (tryDecodeAuctionFunction(functionName, params, action.value, decoded)) {
      if (signature) {
        decoded.formattedCall = buildFormattedCall(
          action.target, functionName, signature, params, action.value
        );
      }
      return decoded;
    }
  }

  // Nouns Descriptor: art trait management functions
  if (target === NOUNS_ADDRESSES.descriptor.toLowerCase()) {
    const descriptorResult = tryDecodeDescriptorFunction(functionName, params, decoded);
    if (descriptorResult) {
      if (signature) {
        decoded.formattedCall = buildFormattedCall(
          action.target, functionName, signature, params, action.value
        );
      }
      return decoded;
    }
  }

  // Default: show function call with full decoded parameters
  const ethValue = BigInt(action.value);
  const hasEthValue = ethValue > BigInt(0);
  
  if (hasEthValue) {
    const ethAmount = formatUnits(ethValue, 18);
    decoded.title = `${functionName || 'Call'} (${parseFloat(ethAmount)} ETH)`;
    decoded.ethValue = `${action.value} // ${parseFloat(ethAmount)} ETH`;
  } else {
    decoded.title = functionName || 'Custom Transaction';
  }
  
  if (targetName) {
    decoded.description = `Call to ${targetName}`;
  } else {
    decoded.description = `Call to contract`;
    // Include target in params for ENS resolution
    decoded.params = { contract: action.target };
  }
  
  // Build formatted function call for display
  if (signature) {
    decoded.formattedCall = buildFormattedCall(
      action.target,
      functionName,
      signature,
      params,
      action.value
    );
  }
  
  return decoded;
}

/**
 * Caller-supplied info about a known stream contract. Lets the decoder
 * describe cancel/recover actions in concrete amounts instead of just
 * "Recipient keeps vested funds".
 */
export interface StreamInfo {
  /** Stream contract address (lowercase). */
  streamAddress: string;
  /** ERC-20 token streamed (lowercase). */
  tokenAddress: string;
  /** Total stream amount as raw bigint string. */
  tokenAmountRaw: string;
  /** Time-based vested fraction, 0..1. Reflects "as of now", not execution. */
  vestedRatio: number;
  /** Optional status — used for "stream hasn't started" / "stream complete" framing. */
  status?: 'pending' | 'active' | 'complete';
}

export interface DecodeOptions {
  /** Map of stream address (lowercase) → StreamInfo. Used to enrich cancel/recover descriptions. */
  streams?: Map<string, StreamInfo>;
}

/**
 * Context for decoding transactions with awareness of related transactions
 */
interface DecodingContext {
  // Stream addresses created by createStream calls (predicted addresses)
  streamAddresses: Set<string>;
  // Targets that are cancelled by a cancel() call within this proposal —
  // used to reframe a following recoverTokens(...) as "return unvested funds"
  cancelledStreams: Set<string>;
  // Caller-supplied stream metadata (total amount, vested fraction, token).
  streams: Map<string, StreamInfo>;
}

/**
 * Build context from all actions to understand relationships
 */
function buildDecodingContext(actions: ProposalAction[], opts?: DecodeOptions): DecodingContext {
  const ctx: DecodingContext = {
    streamAddresses: new Set(),
    cancelledStreams: new Set(),
    streams: opts?.streams ?? new Map(),
  };

  for (const action of actions) {
    // Look for createStream calls and extract predicted stream addresses
    if (action.signature && action.signature.startsWith('createStream(')) {
      const params = tryDecodeParams(action.signature, action.calldata);
      if (params) {
        // param6 is the predicted stream address
        const predictedAddress = params.param6 as string;
        if (predictedAddress) {
          ctx.streamAddresses.add(predictedAddress.toLowerCase());
        }
      }
    }
    // cancel() on any target — treat the target as a stream being cancelled
    if (action.signature === 'cancel()') {
      ctx.cancelledStreams.add(action.target.toLowerCase());
    }
  }

  return ctx;
}

/**
 * Multiply a token amount by a fractional ratio (0..1) with 4-decimal precision.
 * Avoids floating-point on large bigints.
 */
function applyRatio(amount: bigint, ratio: number): bigint {
  const clamped = Math.max(0, Math.min(1, ratio));
  const num = BigInt(Math.round(clamped * 10_000));
  return (amount * num) / BigInt(10_000);
}

/**
 * Format the "Vested X of Y SYMBOL (Z%)" half of a stream cancel description.
 */
function formatVestedSummary(info: StreamInfo): string {
  const total = BigInt(info.tokenAmountRaw);
  const symbol = TOKEN_SYMBOLS[info.tokenAddress] || 'tokens';
  const decimals = TOKEN_DECIMALS[info.tokenAddress] || 18;
  const pct = Math.round(info.vestedRatio * 100);

  if (info.status === 'pending' || info.vestedRatio <= 0) {
    return `Stream hasn't started — nothing vested yet`;
  }
  if (info.status === 'complete' || info.vestedRatio >= 1) {
    return `Stream is complete — fully vested`;
  }
  const vested = applyRatio(total, info.vestedRatio);
  return `Recipient keeps ${formatTokenAmount(vested, decimals)} ${symbol} vested (${pct}% of ${formatTokenAmount(total, decimals)})`;
}

/**
 * Format the "X SYMBOL (Z% unvested)" half of a recoverTokens description.
 * The destination is rendered separately by the consumer (via the `to` param +
 * ENS resolution), so we keep this string focused on the amounts.
 *
 * `verb` matches the action's intent: "Returns" (cancel → treasury),
 * "Redirects" (cancel → other), "Recovers" (standalone cleanup).
 */
function formatRecoverSummary(
  info: StreamInfo,
  verb: 'Returns' | 'Redirects' | 'Recovers',
): string {
  const total = BigInt(info.tokenAmountRaw);
  const symbol = TOKEN_SYMBOLS[info.tokenAddress] || 'tokens';
  const decimals = TOKEN_DECIMALS[info.tokenAddress] || 18;
  const unvestedPct = Math.max(0, Math.round((1 - info.vestedRatio) * 100));

  if (info.status === 'complete' || info.vestedRatio >= 1) {
    return `Stream is fully vested — nothing left to recover`;
  }
  if (info.status === 'pending' || info.vestedRatio <= 0) {
    return `${verb} full ${formatTokenAmount(total, decimals)} ${symbol} (stream hasn't started)`;
  }
  const unvested = total - applyRatio(total, info.vestedRatio);
  return `${verb} ${formatTokenAmount(unvested, decimals)} ${symbol} of ${formatTokenAmount(total, decimals)} (${unvestedPct}% unvested)`;
}

/**
 * Decode a transaction with context about other transactions in the proposal
 */
function decodeTransactionWithContext(action: ProposalAction, ctx: DecodingContext): DecodedTransaction {
  const target = action.target.toLowerCase();
  const targetName = getContractName(target);
  const signature = action.signature || '';
  
  // Extract function name from signature
  const functionMatch = signature.match(/^(\w+)\(/);
  const functionName = functionMatch ? functionMatch[1] : 'Unknown';
  
  // Try to decode parameters
  const params = signature ? tryDecodeParams(signature, action.calldata) : null;
  
  // Build decoded transaction
  const decoded: DecodedTransaction = {
    title: functionName,
    target: action.target,
    targetName,
    functionName,
    value: action.value,
  };
  
  // Stream: cancel() — payer or recipient ends the stream and snapshots
  // the recipient's vested share. Funds aren't returned automatically;
  // recoverTokens() (usually paired in the same proposal) does that.
  if (signature === 'cancel()') {
    decoded.title = 'Cancel payment stream';
    const info = ctx.streams.get(target);
    decoded.description = info
      ? formatVestedSummary(info)
      : 'Recipient keeps vested funds';
    decoded.params = { contract: action.target };
    return decoded;
  }

  // Stream: recoverTokens(address to) — single-arg sweep of the excess
  // balance. When it follows a cancel() on the same target in the same
  // proposal, this is the cancel-cleanup; otherwise it's a standalone
  // recovery (e.g. cleaning up an old cancelled stream, pulling foreign
  // tokens sent to the stream, or recovering an over-funded stream).
  if (signature === 'recoverTokens(address)' && params) {
    const to = params.param0 as string;
    const isTreasury = to.toLowerCase() === NOUNS_ADDRESSES.treasury.toLowerCase();
    const isCancelCleanup = ctx.cancelledStreams.has(target);
    if (isCancelCleanup) {
      decoded.title = isTreasury
        ? 'Return unvested funds to Treasury'
        : 'Redirect unvested funds';
    } else {
      decoded.title = isTreasury
        ? 'Recover stream funds to Treasury'
        : 'Recover stream funds';
    }
    const info = ctx.streams.get(target);
    if (info) {
      // Pick the verb to match the action's intent. Standalone recoveries
      // are always "Recovers"; cancel cleanups split by destination.
      const verb: 'Returns' | 'Redirects' | 'Recovers' = isCancelCleanup
        ? (isTreasury ? 'Returns' : 'Redirects')
        : 'Recovers';
      decoded.description = formatRecoverSummary(info, verb);
    } else {
      decoded.description = isCancelCleanup
        ? 'From the cancelled stream above'
        : 'Sweeps any excess balance from the stream';
    }
    decoded.params = { to };
    return decoded;
  }

  // Stream: recoverTokens(address token, uint256 amount, address to) — explicit
  // form for recovering a specific token amount (e.g. foreign ERC-20 sent by
  // mistake, or partial recovery).
  if (signature === 'recoverTokens(address,uint256,address)' && params) {
    const tokenAddress = (params.param0 as string).toLowerCase();
    const amount = params.param1 as bigint;
    const to = params.param2 as string;
    const symbol = TOKEN_SYMBOLS[tokenAddress] || 'tokens';
    const decimals = TOKEN_DECIMALS[tokenAddress] || 18;
    const formattedAmount = formatTokenAmount(amount, decimals);
    decoded.title = `Recover ${formattedAmount} ${symbol} from stream`;
    decoded.description = ctx.cancelledStreams.has(target)
      ? 'From the cancelled stream above'
      : 'From the stream contract';
    decoded.params = { to };
    return decoded;
  }

  // Stream: rescueETH(address to, uint256 amount) — pulls ETH that ended up
  // in a stream contract by mistake. Payer-only.
  if (signature === 'rescueETH(address,uint256)' && params) {
    const to = params.param0 as string;
    const amount = params.param1 as bigint;
    const eth = parseFloat(formatUnits(amount, 18));
    decoded.title = `Rescue ${eth} ETH from stream`;
    decoded.params = { to };
    return decoded;
  }

  // ERC-20 transfer whose destination is a stream contract created earlier in
  // this proposal — that's the funding leg of a Create-Stream multi-action.
  if (signature === 'transfer(address,uint256)' && params) {
    const to = (params.param0 as string).toLowerCase();
    if (ctx.streamAddresses.has(to)) {
      const amount = params.param1 as bigint;
      const symbol = TOKEN_SYMBOLS[target] || 'tokens';
      const decimals = TOKEN_DECIMALS[target] || 18;
      decoded.title = `Fund stream with ${formatTokenAmount(amount, decimals)} ${symbol}`;
      decoded.description = 'Transfers tokens to the stream contract above';
      decoded.params = { to: params.param0 as string };
      return decoded;
    }
  }

  // Payer: sendOrRegisterDebt(address,uint256) - needs context to determine if funding stream or transfer
  if (signature === 'sendOrRegisterDebt(address,uint256)' && params) {
    const recipient = params.param0 as string;
    const amount = params.param1 as bigint;
    
    // Payer deals with USDC (6 decimals)
    const formattedAmount = formatTokenAmount(amount, 6);
    
    // Check if this is funding a stream contract from a createStream call
    if (ctx.streamAddresses.has(recipient.toLowerCase())) {
      decoded.title = `Fund Stream Contract`;
      decoded.description = `${formattedAmount} USDC via Nouns DAO Payer`;
      decoded.params = { to: recipient };
      return decoded;
    }
    
    // Otherwise it's a direct USDC transfer
    decoded.title = `Transfer ${formattedAmount} USDC`;
    decoded.description = `Via Nouns DAO Payer`;
    decoded.params = { to: recipient };
    return decoded;
  }
  
  // For all other transactions, use the regular decoder
  return decodeTransaction(action);
}

/**
 * Decode multiple transactions with context awareness.
 * Pass `opts.streams` to enrich stream cancel/recover descriptions with
 * concrete vested/unvested amounts.
 */
export function decodeTransactions(
  actions: ProposalAction[],
  opts?: DecodeOptions,
): DecodedTransaction[] {
  const ctx = buildDecodingContext(actions, opts);
  return actions.map(action => decodeTransactionWithContext(action, ctx));
}
