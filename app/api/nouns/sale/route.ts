/**
 * Noun Sale Detection API
 * Checks if a Noun transfer transaction was a sale by looking at:
 * 1. Transaction value (direct ETH transfer)
 * 2. Internal transactions (ETH payments in marketplace sales)
 * 3. WETH transfers in transaction logs (common for OpenSea/Blur)
 */

import { NextResponse } from 'next/server';

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const ETHERSCAN_V2_API = 'https://api.etherscan.io/v2/api';
const CHAIN_ID = '1';

// Known token contracts
const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'.toLowerCase();

// ERC20 Transfer event signature
const TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const txHash = searchParams.get('txHash');
  const seller = searchParams.get('seller');
  
  if (!txHash) {
    return NextResponse.json({ error: 'txHash required' }, { status: 400 });
  }

  if (!ETHERSCAN_API_KEY) {
    return NextResponse.json({ isSale: false, price: null });
  }

  const sellerLower = seller?.toLowerCase();

  try {
    // 1. Check transaction receipt logs for WETH transfers
    const receiptResponse = await fetch(
      `${ETHERSCAN_V2_API}?chainid=${CHAIN_ID}&module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`
    );
    const receiptData = await receiptResponse.json();
    
    if (receiptData.result?.logs) {
      // Look for WETH Transfer events to the seller
      for (const log of receiptData.result.logs) {
        const logAddress = (log.address || '').toLowerCase();
        const topics = log.topics || [];
        
        // Check if this is a WETH Transfer event
        if (logAddress === WETH_ADDRESS && topics[0] === TRANSFER_EVENT_SIGNATURE) {
          // topics[1] = from (padded), topics[2] = to (padded)
          const toAddress = topics[2] ? '0x' + topics[2].slice(26).toLowerCase() : '';
          
          // If transfer is to the seller, this is likely the sale payment
          if (sellerLower && toAddress === sellerLower) {
            const amount = BigInt(log.data || '0');
            if (amount > 0n) {
              return NextResponse.json({ isSale: true, price: amount.toString() });
            }
          }
        }
      }
      
      // If no seller match, look for largest WETH transfer as fallback
      let maxWethTransfer = 0n;
      for (const log of receiptData.result.logs) {
        const logAddress = (log.address || '').toLowerCase();
        const topics = log.topics || [];
        
        if (logAddress === WETH_ADDRESS && topics[0] === TRANSFER_EVENT_SIGNATURE) {
          const amount = BigInt(log.data || '0');
          if (amount > maxWethTransfer) {
            maxWethTransfer = amount;
          }
        }
      }
      
      if (maxWethTransfer > 0n) {
        return NextResponse.json({ isSale: true, price: maxWethTransfer.toString() });
      }
    }

    // 2. Check internal transactions for ETH payments
    const internalResponse = await fetch(
      `${ETHERSCAN_V2_API}?chainid=${CHAIN_ID}&module=account&action=txlistinternal&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`
    );
    const internalData = await internalResponse.json();
    
    if (internalData.status === '1' && internalData.result?.length > 0) {
      let sellerPayment = 0n;
      let maxPayment = 0n;
      
      for (const internal of internalData.result) {
        const internalTo = (internal.to || '').toLowerCase();
        const internalValue = BigInt(internal.value || '0');
        
        if (internalValue > maxPayment) {
          maxPayment = internalValue;
        }
        
        if (sellerLower && internalTo === sellerLower && internalValue > 0n) {
          sellerPayment += internalValue;
        }
      }
      
      if (sellerPayment > 0n) {
        return NextResponse.json({ isSale: true, price: sellerPayment.toString() });
      }
      
      if (maxPayment > 0n) {
        return NextResponse.json({ isSale: true, price: maxPayment.toString() });
      }
    }

    // 3. Check direct transaction value
    const txResponse = await fetch(
      `${ETHERSCAN_V2_API}?chainid=${CHAIN_ID}&module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`
    );
    const txData = await txResponse.json();
    
    if (txData.result) {
      const value = BigInt(txData.result.value || '0');
      if (value > 0n) {
        return NextResponse.json({ isSale: true, price: value.toString() });
      }
    }

    return NextResponse.json({ isSale: false, price: null });
  } catch (error) {
    console.error('Error checking sale:', error);
    return NextResponse.json({ isSale: false, price: null });
  }
}
