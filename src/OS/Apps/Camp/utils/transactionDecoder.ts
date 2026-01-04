/**
 * Transaction Decoder
 * Decodes proposal transactions into human-readable descriptions
 */

import { decodeAbiParameters, formatUnits, type Hex } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';

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

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
    return knownName || formatAddress(value);
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

function formatTokenAmount(amount: bigint, decimals: number): string {
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
 * Decode a proposal action into a human-readable description
 */
export function decodeTransaction(action: ProposalAction): DecodedTransaction {
  const target = action.target.toLowerCase();
  const targetName = getContractName(target);
  const signature = action.signature;
  
  // Extract function name from signature
  const functionMatch = signature.match(/^(\w+)\(/);
  const functionName = functionMatch ? functionMatch[1] : 'Unknown';
  
  // Try to decode parameters
  const params = tryDecodeParams(signature, action.calldata);
  
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
    const tokenId = params.param2 as bigint;
    const to = params.param1 as string;
    
    decoded.title = `Transfer Noun ${tokenId}`;
    decoded.params = { to, nounId: tokenId.toString() };
    return decoded;
  }
  
  // Nouns Token: delegate(address)
  if (signature === 'delegate(address)' && 
      target === NOUNS_ADDRESSES.token.toLowerCase() && params) {
    const delegatee = params.param0 as string;
    
    decoded.title = `Delegate voting power`;
    decoded.params = { to: delegatee };
    return decoded;
  }
  
  // Token Buyer: buyETH(uint256)
  if (signature === 'buyETH(uint256)' && params) {
    const ethAmount = params.param0 as bigint;
    const formattedAmount = formatUnits(ethAmount, 18);
    
    decoded.title = `Buy ${parseFloat(formattedAmount).toLocaleString()} ETH`;
    decoded.description = `Via Token Buyer (using USDC)`;
    return decoded;
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
 * Context for decoding transactions with awareness of related transactions
 */
interface DecodingContext {
  // Stream addresses created by createStream calls (predicted addresses)
  streamAddresses: Set<string>;
}

/**
 * Build context from all actions to understand relationships
 */
function buildDecodingContext(actions: ProposalAction[]): DecodingContext {
  const ctx: DecodingContext = {
    streamAddresses: new Set(),
  };
  
  for (const action of actions) {
    // Look for createStream calls and extract predicted stream addresses
    if (action.signature.startsWith('createStream(')) {
      const params = tryDecodeParams(action.signature, action.calldata);
      if (params) {
        // param6 is the predicted stream address
        const predictedAddress = params.param6 as string;
        if (predictedAddress) {
          ctx.streamAddresses.add(predictedAddress.toLowerCase());
        }
      }
    }
  }
  
  return ctx;
}

/**
 * Decode a transaction with context about other transactions in the proposal
 */
function decodeTransactionWithContext(action: ProposalAction, ctx: DecodingContext): DecodedTransaction {
  const target = action.target.toLowerCase();
  const targetName = getContractName(target);
  const signature = action.signature;
  
  // Extract function name from signature
  const functionMatch = signature.match(/^(\w+)\(/);
  const functionName = functionMatch ? functionMatch[1] : 'Unknown';
  
  // Try to decode parameters
  const params = tryDecodeParams(signature, action.calldata);
  
  // Build decoded transaction
  const decoded: DecodedTransaction = {
    title: functionName,
    target: action.target,
    targetName,
    functionName,
    value: action.value,
  };
  
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
 * Decode multiple transactions with context awareness
 */
export function decodeTransactions(actions: ProposalAction[]): DecodedTransaction[] {
  const ctx = buildDecodingContext(actions);
  return actions.map(action => decodeTransactionWithContext(action, ctx));
}
