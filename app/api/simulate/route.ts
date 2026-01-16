/**
 * Tenderly Transaction Simulation API
 * Simulates proposal transactions using Tenderly's Dashboard API (for shareable links)
 * or falls back to RPC simulation if Dashboard API is not configured
 */

import { NextRequest, NextResponse } from 'next/server';
import { keccak256, toBytes, slice } from 'viem';

// Nouns DAO Executor (Timelock) - this is the address that executes proposals
const NOUNS_EXECUTOR = '0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71';

// Tenderly Dashboard API configuration
const TENDERLY_ACCESS_TOKEN = process.env.TENDERLY_ACCESS_TOKEN;
const TENDERLY_ACCOUNT = process.env.TENDERLY_ACCOUNT;
const TENDERLY_PROJECT = process.env.TENDERLY_PROJECT;

interface ProposalAction {
  target: string;
  value: string;
  signature: string;
  calldata: string;
}

interface SimulationRequest {
  actions: ProposalAction[];
  from?: string; // Optional override for sender
}

interface TransactionResult {
  success: boolean;
  gasUsed: string;
  error?: string;
  errorMessage?: string;
}

interface SimulationResponse {
  success: boolean;
  results: TransactionResult[];
  totalGasUsed: string;
  error?: string;
  /** Shareable Tenderly simulation URL (if Dashboard API is configured) */
  shareUrl?: string;
}

/**
 * Encode function signature and calldata into transaction data
 * For Nouns proposals, signature is like "transfer(address,uint256)"
 * and calldata is the ABI-encoded parameters
 */
function encodeTransactionData(signature: string, calldata: string): string {
  if (!signature) {
    // If no signature, calldata is the full data
    return calldata || '0x';
  }
  
  // Compute function selector from signature: keccak256(signature) -> first 4 bytes
  const selector = slice(keccak256(toBytes(signature)), 0, 4);
  
  // Combine selector with calldata (calldata already has 0x prefix)
  const calldataWithoutPrefix = calldata.startsWith('0x') ? calldata.slice(2) : calldata;
  return selector + calldataWithoutPrefix;
}

/**
 * Simulate using Tenderly Dashboard API (creates shareable simulation)
 */
async function simulateWithDashboardApi(
  actions: ProposalAction[],
  from: string
): Promise<SimulationResponse | null> {
  if (!TENDERLY_ACCESS_TOKEN || !TENDERLY_ACCOUNT || !TENDERLY_PROJECT) {
    return null; // Dashboard API not configured
  }
  
  const apiUrl = `https://api.tenderly.co/api/v1/account/${TENDERLY_ACCOUNT}/project/${TENDERLY_PROJECT}/simulate`;
  
  // For Dashboard API, we simulate each transaction and get a shareable link
  // For multiple transactions, we'll simulate as a bundle
  const simulationPayload = {
    network_id: '1', // Ethereum mainnet
    from,
    save: true, // Save simulation for sharing
    save_if_fails: true, // Save even if it fails
    simulation_type: 'full',
    // For bundles, use the first transaction and state overrides
    // For now, we'll create one simulation that encompasses all transactions
    transactions: actions.map(action => ({
      from,
      to: action.target,
      value: action.value === '0' ? '0' : action.value,
      input: encodeTransactionData(action.signature, action.calldata),
      gas: 16000000,
      gas_price: '0',
    })),
  };
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Key': TENDERLY_ACCESS_TOKEN,
      },
      body: JSON.stringify(simulationPayload),
    });
    
    if (!response.ok) {
      console.error('Tenderly Dashboard API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    // Extract simulation ID for shareable URL
    const simulationId = data.simulation?.id;
    const shareUrl = simulationId 
      ? `https://dashboard.tenderly.co/shared/simulation/${simulationId}`
      : undefined;
    
    // Parse results from Dashboard API response
    const transaction = data.transaction;
    const success = transaction?.status === true;
    const gasUsed = transaction?.gas_used?.toString() || '0';
    
    return {
      success,
      results: [{
        success,
        gasUsed,
        error: transaction?.error_message,
        errorMessage: transaction?.error_message,
      }],
      totalGasUsed: gasUsed,
      shareUrl,
    };
  } catch (error) {
    console.error('Dashboard API simulation failed:', error);
    return null;
  }
}

/**
 * Simulate using Tenderly RPC (faster, but no shareable link)
 */
async function simulateWithRpc(
  actions: ProposalAction[],
  from: string
): Promise<SimulationResponse> {
  const tenderlyUrl = process.env.TENDERLY_NODE_URL;
  if (!tenderlyUrl) {
    throw new Error('Tenderly not configured');
  }
  
  // Build transaction objects for Tenderly RPC
  const transactions = actions.map(action => ({
    from,
    to: action.target,
    value: action.value === '0' ? '0x0' : `0x${BigInt(action.value).toString(16)}`,
    data: encodeTransactionData(action.signature, action.calldata),
    gas: '0x1000000', // 16M gas limit
  }));
  
  // Use bundled simulation for multiple transactions
  const rpcMethod = transactions.length === 1 
    ? 'tenderly_simulateTransaction' 
    : 'tenderly_simulateBundle';
  
  const rpcParams = transactions.length === 1
    ? [transactions[0], 'latest']
    : [transactions, 'latest'];
  
  const response = await fetch(tenderlyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: rpcMethod,
      params: rpcParams,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Tenderly request failed: ${response.status}`);
  }
  
  const rpcResponse = await response.json();
  
  if (rpcResponse.error) {
    throw new Error(rpcResponse.error.message || 'Simulation failed');
  }
  
  // Parse results
  const rawResults = transactions.length === 1 
    ? [rpcResponse.result] 
    : rpcResponse.result;
  
  const results: TransactionResult[] = rawResults.map((result: {
    status: boolean;
    gasUsed: string;
    error?: { message?: string };
    errorMessage?: string;
  }) => ({
    success: result.status === true,
    gasUsed: result.gasUsed || '0',
    error: result.error?.message,
    errorMessage: result.errorMessage,
  }));
  
  const allSuccess = results.every(r => r.success);
  const totalGasUsed = results.reduce((sum, r) => {
    const gas = parseInt(r.gasUsed, 16) || 0;
    return sum + gas;
  }, 0);
  
  return {
    success: allSuccess,
    results,
    totalGasUsed: totalGasUsed.toString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SimulationRequest;
    const { actions, from = NOUNS_EXECUTOR } = body;
    
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No actions provided' },
        { status: 400 }
      );
    }
    
    // Try Dashboard API first (for shareable links)
    const dashboardResult = await simulateWithDashboardApi(actions, from);
    if (dashboardResult) {
      return NextResponse.json(dashboardResult);
    }
    
    // Fall back to RPC simulation
    try {
      const rpcResult = await simulateWithRpc(actions, from);
      return NextResponse.json(rpcResult);
    } catch (rpcError) {
      return NextResponse.json(
        { success: false, error: rpcError instanceof Error ? rpcError.message : 'Simulation failed' },
        { status: 502 }
      );
    }
    
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
