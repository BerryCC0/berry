/**
 * Noun Sale Detection API
 * Checks if a Noun transfer transaction was a sale by looking at:
 * 1. WETH transfers in transaction logs (common for OpenSea/Blur WETH sales)
 * 2. Internal ETH transfers via trace API (catches Blur pool, marketplace ETH flows)
 * 3. Direct ETH value on the transaction (simple direct sales)
 *
 * Uses viem + Alchemy RPC for reliable, typed responses.
 */

import { NextResponse } from 'next/server';
import { createPublicClient, http, type Hex } from 'viem';
import { mainnet } from 'viem/chains';

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// Known token contracts
const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as const;

// ERC20 Transfer event signature: Transfer(address,address,uint256)
const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' as const;

// Trace action type for internal calls
interface TraceAction {
  callType?: string;
  from?: string;
  to?: string;
  value?: string;
  gas?: string;
  input?: string;
}

interface TraceResult {
  action: TraceAction;
  type: string;
  subtraces?: number;
  traceAddress?: number[];
  result?: { gasUsed?: string; output?: string };
  error?: string;
}

function getClient() {
  const rpcUrl = ALCHEMY_API_KEY
    ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    : undefined;

  return createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl),
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const txHash = searchParams.get('txHash');
  const seller = searchParams.get('seller');

  if (!txHash) {
    return NextResponse.json({ error: 'txHash required' }, { status: 400 });
  }

  const sellerLower = seller?.toLowerCase();

  try {
    const client = getClient();

    // Fetch receipt (logs) and transaction (value) in parallel
    const [receipt, tx] = await Promise.all([
      client.getTransactionReceipt({ hash: txHash as Hex }),
      client.getTransaction({ hash: txHash as Hex }),
    ]);

    // 1. Check transaction receipt logs for WETH transfers
    if (receipt.logs.length > 0) {
      // First pass: look for WETH Transfer to the seller specifically
      for (const log of receipt.logs) {
        if (
          log.address.toLowerCase() === WETH_ADDRESS &&
          log.topics[0] === TRANSFER_EVENT_TOPIC &&
          log.topics[2] // to address
        ) {
          const toAddress = ('0x' + log.topics[2].slice(26)).toLowerCase();

          if (sellerLower && toAddress === sellerLower) {
            const amount = BigInt(log.data);
            if (amount > BigInt(0)) {
              return NextResponse.json({ isSale: true, price: amount.toString() });
            }
          }
        }
      }

      // Second pass: fallback to largest WETH transfer in the tx
      let maxWethTransfer = BigInt(0);
      for (const log of receipt.logs) {
        if (
          log.address.toLowerCase() === WETH_ADDRESS &&
          log.topics[0] === TRANSFER_EVENT_TOPIC
        ) {
          const amount = BigInt(log.data);
          if (amount > maxWethTransfer) {
            maxWethTransfer = amount;
          }
        }
      }

      if (maxWethTransfer > BigInt(0)) {
        return NextResponse.json({ isSale: true, price: maxWethTransfer.toString() });
      }
    }

    // 2. Check direct transaction value (for direct ETH sales via Seaport etc.)
    if (tx.value > BigInt(0)) {
      return NextResponse.json({ isSale: true, price: tx.value.toString() });
    }

    // 3. Check internal transactions via trace API
    //    This catches marketplace sales where ETH flows through internal calls
    //    (e.g. Blur pool purchases, aggregator routed sales)
    //    trace_transaction is not in viem's typed RPC schema, so we call it directly
    try {
      const rpcUrl = ALCHEMY_API_KEY
        ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
        : 'https://eth.llamarpc.com';

      const traceResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'trace_transaction',
          params: [txHash],
        }),
      });
      const traceData = await traceResponse.json();
      const traces: TraceResult[] = traceData.result;

      if (Array.isArray(traces)) {
        let sellerPayment = BigInt(0);
        let maxPayment = BigInt(0);

        for (const trace of traces) {
          // Only look at call-type traces (skip create/suicide)
          if (trace.type !== 'call') continue;
          // Skip failed traces
          if (trace.error) continue;

          const action = trace.action;
          if (!action?.value) continue;

          const value = BigInt(action.value);
          if (value <= BigInt(0)) continue;

          const to = (action.to || '').toLowerCase();

          if (value > maxPayment) {
            maxPayment = value;
          }

          if (sellerLower && to === sellerLower) {
            sellerPayment += value;
          }
        }

        // Prefer seller-specific payment when we know the seller
        if (sellerPayment > BigInt(0)) {
          return NextResponse.json({ isSale: true, price: sellerPayment.toString() });
        }

        // Fallback to largest internal ETH transfer
        if (maxPayment > BigInt(0)) {
          return NextResponse.json({ isSale: true, price: maxPayment.toString() });
        }
      }
    } catch (traceError) {
      // trace_transaction may not be available on all providers/plans
      // This is non-fatal - we just can't detect internal-tx-only sales
      console.warn('trace_transaction unavailable, skipping internal tx check:', 
        traceError instanceof Error ? traceError.message : traceError);
    }

    return NextResponse.json({ isSale: false, price: null });
  } catch (error) {
    console.error('Error checking sale:', error);
    return NextResponse.json({ isSale: false, price: null });
  }
}
