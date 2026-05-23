/**
 * swap-to-usdc — focused USDC swapper for the most common treasury moves.
 *
 * Same on-chain primitive as `swap-uniswap-v3` (Uniswap V3 SwapRouter02),
 * but with the destination pinned to USDC and the source narrowed to the
 * treasury holdings the DAO actually swaps from. The editor abstracts
 * the wrap step (for ETH input) and the fee-tier picking.
 *
 *   • ETH input    → 3-action: WETH.deposit{value} → WETH.approve(router) → exactInputSingle(WETH→USDC)
 *   • WETH input   → 2-action: WETH.approve(router) → exactInputSingle(WETH→USDC)
 *   • wstETH input → 2-action: wstETH.approve(router) → exactInputSingle(wstETH→USDC)
 *
 * **Decoder priority.** Registered before `swapUniswapV3` in `registry.ts`
 * so any USDC-bound single-hop with a recognised source token gets the
 * focused editor on edit. Disambiguation is by:
 *   - 3-action bundles: WETH.deposit() prefix is unique to this action
 *   - 2-action bundles: tokenIn ∈ {WETH, wstETH} AND tokenOut == USDC
 * Anything else (e.g. DAI→USDC, WETH→DAI) falls through to the generic
 * swap-uniswap-v3.
 */

import {
  encodeAbiParameters,
  parseAbiParameters,
  parseEther,
  parseUnits,
  type Address,
} from 'viem';
import {
  COMMON_TOKENS,
  EXTERNAL_CONTRACTS,
  UNISWAP_V3_ROUTER_ADDRESS,
  WSTETH_ADDRESS,
} from '../../actionTemplates/constants';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  matchSignature,
  matchTarget,
  multiActionId,
} from '../shared';
import type {
  ActionDescription,
  ProposalAction,
  TransactionActionDef,
} from '../types';

export type SwapToUsdcSource = 'eth' | 'weth' | 'wsteth';

interface Fields {
  /** Which treasury holding to swap from. */
  sourceToken: string;
  /** Input amount in human display units of the source token. */
  amountIn: string;
  /** Uniswap V3 fee tier in BPS-of-percent (100 / 500 / 3000 / 10000). */
  fee: string;
  /**
   * Min USDC out, in display units (6 decimals). The editor computes this
   * from the live quote × (1 − slippage); kept as a string field so the
   * action remains round-trippable without re-quoting.
   */
  amountOutMinimum: string;
}

const APPROVE_SIG = 'approve(address,uint256)';
const DEPOSIT_SIG = 'deposit()';
const SWAP_SIG =
  'exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))';

const WETH = EXTERNAL_CONTRACTS.WETH.address;
const USDC = EXTERNAL_CONTRACTS.USDC.address;
const TREASURY = NOUNS_ADDRESSES.treasury as Address;
const ROUTER = UNISWAP_V3_ROUTER_ADDRESS as Address;
const USDC_DECIMALS =
  COMMON_TOKENS.find((t) => t.symbol === 'USDC')?.decimals ?? 6;

interface SourceTokenInfo {
  address: Address;
  decimals: number;
  symbol: string;
}

function sourceTokenInfo(source: SwapToUsdcSource): SourceTokenInfo {
  // All three source variants ultimately swap from an 18-decimal ERC-20
  // (ETH gets wrapped to WETH first; wstETH is also 18 decimals). The
  // address is what's used in the swap's tokenIn — for ETH that's WETH.
  switch (source) {
    case 'eth':
      return { address: WETH as Address, decimals: 18, symbol: 'ETH' };
    case 'weth':
      return { address: WETH as Address, decimals: 18, symbol: 'WETH' };
    case 'wsteth':
      return { address: WSTETH_ADDRESS as Address, decimals: 18, symbol: 'wstETH' };
  }
}

function parseSource(raw: string | undefined): SwapToUsdcSource {
  if (raw === 'eth' || raw === 'weth' || raw === 'wsteth') return raw;
  return 'weth'; // sensible default if a draft lacks the field
}

function buildSwapAction(
  tokenIn: Address,
  amountIn: bigint,
  amountOutMin: bigint,
  fee: number,
): ProposalAction {
  return {
    target: ROUTER,
    value: '0',
    signature: SWAP_SIG,
    calldata: encodeAbiParameters(
      parseAbiParameters(
        '(address, address, uint24, address, uint256, uint256, uint160)',
      ),
      [
        [
          tokenIn,
          USDC as Address,
          fee,
          TREASURY,
          amountIn,
          amountOutMin,
          BigInt(0), // sqrtPriceLimitX96 = 0 → no limit
        ],
      ],
    ),
  };
}

function buildApproveAction(
  token: Address,
  spender: Address,
  amount: bigint,
): ProposalAction {
  return {
    target: token,
    value: '0',
    signature: APPROVE_SIG,
    calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
      spender,
      amount,
    ]),
  };
}

export const swapToUsdc: TransactionActionDef<Fields> = {
  id: 'swap-to-usdc',
  category: 'swaps',
  name: 'Swap to USDC',
  description:
    "Swap a treasury holding (ETH / WETH / wstETH) to USDC on Uniswap V3. Handles the WETH wrap automatically when starting from ETH.",
  isMultiAction: true,
  fields: [
    {
      name: 'sourceToken',
      label: 'From',
      type: 'text',
      required: true,
      helpText: "'eth', 'weth', or 'wsteth'.",
    },
    {
      name: 'amountIn',
      label: 'Amount In',
      type: 'amount',
      placeholder: '0.0',
      required: true,
      validation: { min: 0, decimals: 18 },
    },
    {
      name: 'fee',
      label: 'Fee Tier',
      type: 'number',
      required: true,
      helpText: 'Uniswap V3 fee tier in BPS-of-percent (100/500/3000/10000).',
    },
    {
      name: 'amountOutMinimum',
      label: 'Min USDC Out',
      type: 'amount',
      required: true,
      validation: { min: 0, decimals: USDC_DECIMALS },
    },
  ],

  encode(values) {
    const source = parseSource(values.sourceToken);
    const { address: tokenInForSwap } = sourceTokenInfo(source);
    const amountIn = parseUnits(values.amountIn || '0', 18);
    const amountOutMin = parseUnits(values.amountOutMinimum || '0', USDC_DECIMALS);
    const fee = Number(values.fee || '500');

    const swap = buildSwapAction(tokenInForSwap, amountIn, amountOutMin, fee);
    const approve = buildApproveAction(tokenInForSwap, ROUTER, amountIn);

    // Hash off the swap calldata so the group id is deterministic and stable
    // across encode → decode → re-encode, matching the pattern used in
    // `swap-uniswap-v3`.
    const groupId = multiActionId('swap-to-usdc', { calldata: swap.calldata });

    if (source === 'eth') {
      const wrap: ProposalAction = {
        target: WETH as Address,
        value: parseEther(values.amountIn || '0').toString(),
        signature: DEPOSIT_SIG,
        calldata: '0x',
      };
      return [
        { ...wrap, isPartOfMultiAction: true, multiActionGroupId: groupId, multiActionIndex: 0 },
        { ...approve, isPartOfMultiAction: true, multiActionGroupId: groupId, multiActionIndex: 1 },
        { ...swap, isPartOfMultiAction: true, multiActionGroupId: groupId, multiActionIndex: 2 },
      ];
    }

    return [
      { ...approve, isPartOfMultiAction: true, multiActionGroupId: groupId, multiActionIndex: 0 },
      { ...swap, isPartOfMultiAction: true, multiActionGroupId: groupId, multiActionIndex: 1 },
    ];
  },

  decode(actions, cursor) {
    // First, try the 3-action ETH shape: wrap + approve + swap.
    const a0 = actions[cursor];
    const a1 = actions[cursor + 1];
    const a2 = actions[cursor + 2];

    if (
      a0 &&
      a1 &&
      a2 &&
      addressEquals(a0.target, WETH) &&
      a0.signature === DEPOSIT_SIG &&
      a0.value &&
      a0.value !== '0' &&
      matchSignature(a1, APPROVE_SIG) &&
      addressEquals(a1.target, WETH) &&
      matchTarget(a2, ROUTER) &&
      matchSignature(a2, SWAP_SIG)
    ) {
      const swapArgs = decodeSwap(a2.calldata);
      if (swapArgs && addressEquals(swapArgs.tokenIn, WETH) && addressEquals(swapArgs.tokenOut, USDC)) {
        return {
          values: {
            sourceToken: 'eth',
            amountIn: formatTokenAmount(swapArgs.amountIn, 18),
            fee: swapArgs.fee.toString(),
            amountOutMinimum: formatTokenAmount(
              swapArgs.amountOutMin,
              USDC_DECIMALS,
            ),
          },
          consumed: 3,
        };
      }
    }

    // Then the 2-action shape: approve + swap.
    const approve = actions[cursor];
    const swap = actions[cursor + 1];
    if (
      approve &&
      swap &&
      matchSignature(approve, APPROVE_SIG) &&
      matchTarget(swap, ROUTER) &&
      matchSignature(swap, SWAP_SIG)
    ) {
      const approveArgs = decodeArgs<readonly [Address, bigint]>(
        approve.calldata,
        'address, uint256',
      );
      if (!approveArgs || !addressEquals(approveArgs[0], ROUTER)) return null;
      const swapArgs = decodeSwap(swap.calldata);
      if (!swapArgs) return null;
      if (!addressEquals(swapArgs.tokenOut, USDC)) return null;
      if (!addressEquals(approve.target, swapArgs.tokenIn)) return null;
      if (approveArgs[1] !== swapArgs.amountIn) return null;

      let source: SwapToUsdcSource | null = null;
      if (addressEquals(swapArgs.tokenIn, WETH)) source = 'weth';
      else if (addressEquals(swapArgs.tokenIn, WSTETH_ADDRESS)) source = 'wsteth';

      if (!source) return null;

      return {
        values: {
          sourceToken: source,
          amountIn: formatTokenAmount(swapArgs.amountIn, 18),
          fee: swapArgs.fee.toString(),
          amountOutMinimum: formatTokenAmount(
            swapArgs.amountOutMin,
            USDC_DECIMALS,
          ),
        },
        consumed: 2,
      };
    }

    return null;
  },

  describe(values) {
    const source = parseSource(values.sourceToken);
    const { symbol } = sourceTokenInfo(source);
    const descriptions: ActionDescription[] = [];

    if (source === 'eth') {
      descriptions.push({
        title: `Wrap ${values.amountIn} ETH → WETH`,
        description: 'Mints WETH 1:1 from the treasury ETH balance',
        functionName: 'deposit',
        params: { value: values.amountIn },
      });
    }
    descriptions.push({
      title: `Approve ${values.amountIn} ${source === 'eth' ? 'WETH' : symbol}`,
      description: 'for the Uniswap V3 router',
      functionName: 'approve',
      params: { spender: ROUTER, amount: values.amountIn },
    });
    descriptions.push({
      title: `Swap ${values.amountIn} ${symbol} → USDC`,
      description: `for at least ${values.amountOutMinimum} USDC`,
      functionName: 'exactInputSingle',
      params: {
        tokenIn: source === 'eth' ? WETH : sourceTokenInfo(source).address,
        tokenOut: USDC,
        amountIn: values.amountIn,
        amountOutMinimum: values.amountOutMinimum,
      },
    });
    return descriptions;
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decodeSwap(calldata: string | undefined): {
  tokenIn: Address;
  tokenOut: Address;
  fee: number;
  recipient: Address;
  amountIn: bigint;
  amountOutMin: bigint;
} | null {
  const args = decodeArgs<
    readonly [readonly [Address, Address, number, Address, bigint, bigint, bigint]]
  >(calldata, '(address, address, uint24, address, uint256, uint256, uint160)');
  if (!args) return null;
  const [tokenIn, tokenOut, fee, recipient, amountIn, amountOutMin] = args[0];
  return { tokenIn, tokenOut, fee, recipient, amountIn, amountOutMin };
}
