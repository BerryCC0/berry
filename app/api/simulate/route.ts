/**
 * Tenderly Transaction Simulation API
 * Simulates proposal transactions using Tenderly's RPC
 */

import { NextRequest, NextResponse } from 'next/server';
import { keccak256, toBytes, slice } from 'viem';

// Nouns DAO Executor (Timelock) - this is the address that executes proposals
const NOUNS_EXECUTOR = '0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71';

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
    
    const tenderlyUrl = process.env.TENDERLY_NODE_URL;
    if (!tenderlyUrl) {
      return NextResponse.json(
        { success: false, error: 'Tenderly not configured' },
        { status: 500 }
      );
    }
    
    // Build transaction objects for Tenderly
    const transactions = actions.map(action => ({
      from,
      to: action.target,
      value: action.value === '0' ? '0x0' : `0x${BigInt(action.value).toString(16)}`,
      data: encodeTransactionData(action.signature, action.calldata),
      gas: '0x1000000', // 16M gas limit
    }));
    
    // Use bundled simulation for multiple transactions
    // This simulates them in sequence, with state changes carrying over
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
      return NextResponse.json(
        { success: false, error: `Tenderly request failed: ${response.status}` },
        { status: 502 }
      );
    }
    
    const rpcResponse = await response.json();
    
    if (rpcResponse.error) {
      return NextResponse.json(
        { success: false, error: rpcResponse.error.message || 'Simulation failed' },
        { status: 400 }
      );
    }
    
    // Parse results
    // For single transaction, result is directly in rpcResponse.result
    // For bundle, result is an array
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
    
    const simulationResponse: SimulationResponse = {
      success: allSuccess,
      results,
      totalGasUsed: totalGasUsed.toString(),
    };
    
    return NextResponse.json(simulationResponse);
    
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
