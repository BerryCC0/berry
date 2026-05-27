/**
 * swap-uniswap-v3 — 2-action: approve(router, amountIn) + exactInputSingle.
 *
 * SwapRouter02 takes a 7-tuple struct (no `deadline` — that was removed when
 * the router moved to Permit2 + Multicall). The legacy custom editor
 * (UniswapV3SwapEditor) handles live quoting and slippage → amountOutMinimum.
 */

import { type Address, encodeAbiParameters, parseAbiParameters, parseUnits } from 'viem';
import {
  COMMON_TOKENS,
  UNISWAP_V3_ROUTER_ADDRESS,
} from '../../actionTemplates/constants';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  matchSignature,
  matchTarget,
  multiActionId,
  parseTokenSelectValue,
  stringifyTokenSelectValue,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  tokenIn: string;
  tokenOut: string;
  fee: string;
  amountIn: string;
  amountOutMinimum: string;
  /** Set by the editor from on-chain `decimals()` for the chosen output token. */
  tokenOutDecimals: string;
}

const APPROVE_SIG = 'approve(address,uint256)';
const SWAP_SIG =
  'exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))';
const TREASURY = NOUNS_ADDRESSES.treasury as Address;

export const swapUniswapV3: TransactionActionDef<Fields> = {
  id: 'swap-uniswap-v3',
  category: 'swaps',
  name: 'Swap (Uniswap V3)',
  description: 'Single-hop swap on Uniswap V3 with explicit slippage protection',
  isMultiAction: true,
  fields: [
    { name: 'tokenIn', label: 'Token In', type: 'token-select', required: true },
    { name: 'tokenOut', label: 'Token Out', type: 'address', required: true },
    { name: 'fee', label: 'Fee Tier (BPS)', type: 'number', required: true },
    { name: 'amountIn', label: 'Amount In', type: 'amount', required: true },
    { name: 'amountOutMinimum', label: 'Min Out', type: 'amount', required: true },
    { name: 'tokenOutDecimals', label: 'Out Decimals', type: 'number', required: true },
  ],

  encode(values) {
    const tokenIn = parseTokenSelectValue(values.tokenIn, COMMON_TOKENS);
    if (!tokenIn) throw new Error('swap-uniswap-v3: invalid tokenIn');
    const tokenOut = values.tokenOut as Address;
    const fee = Number(values.fee || '3000');
    const amountIn = parseUnits(values.amountIn || '0', tokenIn.decimals);
    const decimalsOut = Number(values.tokenOutDecimals || '18');
    const amountOutMin = parseUnits(values.amountOutMinimum || '0', decimalsOut);
    const groupId = multiActionId('swap-uniswap-v3', values);

    return [
      {
        target: tokenIn.address,
        value: '0',
        signature: APPROVE_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
          UNISWAP_V3_ROUTER_ADDRESS as Address,
          amountIn,
        ]),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 0,
      },
      {
        target: UNISWAP_V3_ROUTER_ADDRESS as Address,
        value: '0',
        signature: SWAP_SIG,
        calldata: encodeAbiParameters(
          parseAbiParameters('(address, address, uint24, address, uint256, uint256, uint160)'),
          [
            [
              tokenIn.address,
              tokenOut,
              fee,
              TREASURY,
              amountIn,
              amountOutMin,
              BigInt(0), // sqrtPriceLimitX96 = 0 → no limit
            ],
          ],
        ),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 1,
      },
      // Defense-in-depth revoke: reset the router allowance to 0 after the
      // swap. SwapRouter02's transferFrom consumes exactly `amountIn` so the
      // allowance is naturally 0 on success, but explicitly pinning it makes
      // the proposal safe against partial fills, Permit2 path changes, and
      // any future shared-approval bug. Security-audit standard.
      {
        target: tokenIn.address,
        value: '0',
        signature: APPROVE_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
          UNISWAP_V3_ROUTER_ADDRESS as Address,
          BigInt(0),
        ]),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 2,
      },
    ];
  },

  decode(actions, cursor) {
    const approve = actions[cursor];
    const swap = actions[cursor + 1];
    const revoke = actions[cursor + 2];
    if (!approve || !swap) return null;

    if (!matchSignature(approve, APPROVE_SIG)) return null;
    if (!matchTarget(swap, UNISWAP_V3_ROUTER_ADDRESS)) return null;
    if (!matchSignature(swap, SWAP_SIG)) return null;

    const approveArgs = decodeArgs<readonly [Address, bigint]>(
      approve,
      'address, uint256',
    );
    if (!approveArgs) return null;
    if (!addressEquals(approveArgs[0], UNISWAP_V3_ROUTER_ADDRESS)) return null;

    const swapArgs = decodeArgs<
      readonly [readonly [Address, Address, number, Address, bigint, bigint, bigint]]
    >(swap, '(address, address, uint24, address, uint256, uint256, uint160)');
    if (!swapArgs) return null;
    const [tokenInAddr, tokenOut, fee, recipient, amountIn, amountOutMin] = swapArgs[0];
    if (!addressEquals(recipient, TREASURY)) return null;
    if (!addressEquals(approve.target, tokenInAddr)) return null;
    if (approveArgs[1] !== amountIn) return null;

    // Optional revoke leg: same tokenIn.approve(router, 0). Legacy 2-action
    // drafts pre-date this — fall back to consumed: 2 in that case.
    let consumed = 2;
    if (
      revoke &&
      matchSignature(revoke, APPROVE_SIG) &&
      addressEquals(revoke.target, tokenInAddr)
    ) {
      const revokeArgs = decodeArgs<readonly [Address, bigint]>(
        revoke,
        'address, uint256',
      );
      if (
        revokeArgs &&
        addressEquals(revokeArgs[0], UNISWAP_V3_ROUTER_ADDRESS) &&
        revokeArgs[1] === BigInt(0)
      ) {
        consumed = 3;
      }
    }

    const knownIn = COMMON_TOKENS.find((t) => addressEquals(t.address, tokenInAddr));
    const decimalsIn = knownIn?.decimals ?? 18;
    // We can't infer tokenOut's decimals from calldata alone; round-trip uses
    // the legacy default of 18 unless the editor's hint is preserved elsewhere.
    return {
      values: {
        tokenIn: stringifyTokenSelectValue({
          symbol: knownIn?.symbol ?? tokenInAddr,
          address: tokenInAddr,
          decimals: decimalsIn,
          isNative: false,
        }),
        tokenOut,
        fee: fee.toString(),
        amountIn: formatTokenAmount(amountIn, decimalsIn),
        amountOutMinimum: formatTokenAmount(amountOutMin, 18),
        tokenOutDecimals: '18',
      },
      consumed,
    };
  },

  describe(values) {
    const tokenIn = parseTokenSelectValue(values.tokenIn);
    const symbol = tokenIn?.symbol ?? 'tokens';
    return [
      {
        title: `Approve ${values.amountIn} ${symbol}`,
        description: 'for the Uniswap V3 router',
        functionName: 'approve',
      },
      {
        title: `Swap ${values.amountIn} ${symbol}`,
        description: `for at least ${values.amountOutMinimum} of ${values.tokenOut}`,
        functionName: 'exactInputSingle',
      },
      {
        title: `Revoke ${symbol} approval`,
        description: 'Reset the Uniswap V3 router allowance to 0 (defense-in-depth)',
        functionName: 'approve',
      },
    ];
  },
};
