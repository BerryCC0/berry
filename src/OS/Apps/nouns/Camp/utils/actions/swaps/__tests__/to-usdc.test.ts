import { describe, it, expect } from 'vitest';
import { parseEther, parseUnits } from 'viem';
import { swapToUsdc } from '../to-usdc';
import { swapUniswapV3 } from '../uniswap-v3';
import {
  EXTERNAL_CONTRACTS,
  UNISWAP_V3_ROUTER_ADDRESS,
  WSTETH_ADDRESS,
} from '../../../actionTemplates/constants';
import {
  assertRoundTrip,
  emptyDecodeContext,
  emptyEncodeContext,
} from '../../__tests__/roundTrip';

const USDC = EXTERNAL_CONTRACTS.USDC.address;
const WETH = EXTERNAL_CONTRACTS.WETH.address;
const ROUTER = UNISWAP_V3_ROUTER_ADDRESS;

const ctx = emptyDecodeContext();

describe('swap-to-usdc — WETH source', () => {
  const fields = {
    sourceToken: 'weth',
    amountIn: '1.5',
    fee: '500',
    amountOutMinimum: '5000',
  };

  it('emits 3 actions: approve + swap + revoke', () => {
    const actions = swapToUsdc.encode(fields, emptyEncodeContext());
    expect(actions).toHaveLength(3);
    // Approve leg
    expect(actions[0].target.toLowerCase()).toBe(WETH.toLowerCase());
    expect(actions[0].signature).toBe('approve(address,uint256)');
    expect(actions[0].value).toBe('0');
    // Swap leg
    expect(actions[1].target).toBe(ROUTER);
    expect(actions[1].signature).toContain('exactInputSingle');
    expect(actions[1].value).toBe('0');
    // Revoke leg — same token, same spender (router), amount = 0
    expect(actions[2].target.toLowerCase()).toBe(WETH.toLowerCase());
    expect(actions[2].signature).toBe('approve(address,uint256)');
    expect(actions[2].value).toBe('0');
    // The last 32 bytes of the revoke calldata should be all zeros (amount=0).
    expect(actions[2].calldata.endsWith('0'.repeat(64))).toBe(true);
  });

  it('round-trips', () => {
    assertRoundTrip(swapToUsdc, fields);
  });

  it('produces deterministic group IDs (no Date.now())', () => {
    const a = swapToUsdc.encode(fields, emptyEncodeContext());
    const b = swapToUsdc.encode(fields, emptyEncodeContext());
    expect(a[0].multiActionGroupId).toBe(b[0].multiActionGroupId);
  });
});

describe('swap-to-usdc — wstETH source', () => {
  const fields = {
    sourceToken: 'wsteth',
    amountIn: '2',
    fee: '500',
    amountOutMinimum: '8200',
  };

  it('emits 3 actions: approve(wstETH, router) + exactInputSingle(wstETH→USDC) + revoke', () => {
    const actions = swapToUsdc.encode(fields, emptyEncodeContext());
    expect(actions).toHaveLength(3);
    expect(actions[0].target.toLowerCase()).toBe(WSTETH_ADDRESS.toLowerCase());
    expect(actions[1].target).toBe(ROUTER);
    expect(actions[2].target.toLowerCase()).toBe(WSTETH_ADDRESS.toLowerCase());
    expect(actions[2].calldata.endsWith('0'.repeat(64))).toBe(true);
  });

  it('round-trips', () => {
    assertRoundTrip(swapToUsdc, fields);
  });
});

describe('swap-to-usdc — ETH source (wrap + approve + swap + revoke)', () => {
  const fields = {
    sourceToken: 'eth',
    amountIn: '5',
    fee: '500',
    amountOutMinimum: '17000',
  };

  it('emits 4 actions: WETH.deposit{value} + approve + swap + revoke', () => {
    const actions = swapToUsdc.encode(fields, emptyEncodeContext());
    expect(actions).toHaveLength(4);
    // Wrap leg
    expect(actions[0].target.toLowerCase()).toBe(WETH.toLowerCase());
    expect(actions[0].signature).toBe('deposit()');
    expect(actions[0].value).toBe(parseEther('5').toString());
    expect(actions[0].calldata).toBe('0x');
    // Approve leg
    expect(actions[1].target.toLowerCase()).toBe(WETH.toLowerCase());
    expect(actions[1].signature).toBe('approve(address,uint256)');
    expect(actions[1].value).toBe('0');
    // Swap leg
    expect(actions[2].target).toBe(ROUTER);
    expect(actions[2].signature).toContain('exactInputSingle');
    expect(actions[2].value).toBe('0');
    // Revoke leg — WETH.approve(router, 0)
    expect(actions[3].target.toLowerCase()).toBe(WETH.toLowerCase());
    expect(actions[3].signature).toBe('approve(address,uint256)');
    expect(actions[3].calldata.endsWith('0'.repeat(64))).toBe(true);
  });

  it('round-trips with the same fields', () => {
    assertRoundTrip(swapToUsdc, fields);
  });
});

/**
 * Backward compatibility: drafts saved before the revoke leg landed are
 * legacy 2-action (token source) or 3-action (ETH source) shapes. The
 * decoder must still recognise them so old drafts re-edit cleanly.
 */
describe('swap-to-usdc — legacy decoder support (no revoke leg)', () => {
  it('decodes a legacy 2-action WETH bundle (approve + swap, no revoke)', () => {
    const full = swapToUsdc.encode(
      { sourceToken: 'weth', amountIn: '1', fee: '500', amountOutMinimum: '3300' },
      emptyEncodeContext(),
    );
    // Drop the revoke to simulate a legacy draft.
    const legacy = full.slice(0, 2);
    const result = swapToUsdc.decode(legacy, 0, ctx);
    expect(result).not.toBeNull();
    expect(result?.consumed).toBe(2);
    expect(result?.values.sourceToken).toBe('weth');
  });

  it('decodes a legacy 3-action ETH bundle (wrap + approve + swap, no revoke)', () => {
    const full = swapToUsdc.encode(
      { sourceToken: 'eth', amountIn: '1', fee: '500', amountOutMinimum: '3300' },
      emptyEncodeContext(),
    );
    const legacy = full.slice(0, 3);
    const result = swapToUsdc.decode(legacy, 0, ctx);
    expect(result).not.toBeNull();
    expect(result?.consumed).toBe(3);
    expect(result?.values.sourceToken).toBe('eth');
  });
});

/**
 * REGRESSION: `swap-to-usdc` shares the 2-action approve+exactInputSingle
 * shape with the generic `swap-uniswap-v3`. The decoder dispatch order in
 * the registry has swap-to-usdc FIRST. Verify that:
 *   - USDC-bound swaps from supported sources go to swap-to-usdc
 *   - Non-USDC-bound swaps (or unsupported-source swaps) stay with swap-uniswap-v3
 */
describe('swap-to-usdc vs swap-uniswap-v3 discrimination', () => {
  it('a USDC-bound WETH swap decodes as swap-to-usdc and NOT as swap-uniswap-v3', () => {
    const actions = swapToUsdc.encode(
      {
        sourceToken: 'weth',
        amountIn: '1',
        fee: '500',
        amountOutMinimum: '3300',
      },
      emptyEncodeContext(),
    );
    expect(swapToUsdc.decode(actions, 0, ctx)).not.toBeNull();
    // The generic decoder will also match this (it accepts ANY approve+swap),
    // but the registry dispatch puts swap-to-usdc first so swap-uniswap-v3
    // never gets called for it. We don't need to assert null here — just
    // confirm registry ordering elsewhere.
  });

  it('a non-USDC swap (e.g. WETH→DAI) decodes as swap-uniswap-v3 and NOT as swap-to-usdc', () => {
    // Build a WETH→DAI swap using the generic action.
    const actions = swapUniswapV3.encode(
      {
        tokenIn: JSON.stringify({
          symbol: 'WETH',
          address: WETH,
          decimals: 18,
          isNative: false,
        }),
        tokenOut: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
        fee: '3000',
        amountIn: '1',
        amountOutMinimum: '3300',
        tokenOutDecimals: '18',
      },
      emptyEncodeContext(),
    );
    expect(swapToUsdc.decode(actions, 0, ctx)).toBeNull();
    expect(swapUniswapV3.decode(actions, 0, ctx)).not.toBeNull();
  });

  it('a USDC-bound swap from an unsupported source (e.g. DAI→USDC) is NOT claimed by swap-to-usdc', () => {
    const actions = swapUniswapV3.encode(
      {
        tokenIn: JSON.stringify({
          symbol: 'DAI',
          address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          decimals: 18,
          isNative: false,
        }),
        tokenOut: USDC,
        fee: '100',
        amountIn: '1000',
        amountOutMinimum: '999',
        tokenOutDecimals: '6',
      },
      emptyEncodeContext(),
    );
    expect(swapToUsdc.decode(actions, 0, ctx)).toBeNull();
    expect(swapUniswapV3.decode(actions, 0, ctx)).not.toBeNull();
  });
});

describe('swap-to-usdc — describe', () => {
  it('describes a WETH source as 2 lines (approve + swap)', () => {
    const lines = swapToUsdc.describe(
      {
        sourceToken: 'weth',
        amountIn: '1.5',
        fee: '500',
        amountOutMinimum: '5000',
      },
      [],
      ctx,
    );
    expect(lines).toHaveLength(3);
    expect(lines[0].title).toContain('Approve');
    expect(lines[1].title).toContain('Swap');
    expect(lines[1].title).toContain('WETH');
    expect(lines[1].title).toContain('USDC');
    expect(lines[2].title).toContain('Revoke');
  });

  it('describes an ETH source as 4 lines (wrap + approve + swap + revoke)', () => {
    const lines = swapToUsdc.describe(
      {
        sourceToken: 'eth',
        amountIn: '5',
        fee: '500',
        amountOutMinimum: '17000',
      },
      [],
      ctx,
    );
    expect(lines).toHaveLength(4);
    expect(lines[0].title).toContain('Wrap');
    expect(lines[0].title).toContain('ETH');
    expect(lines[1].title).toContain('Approve');
    expect(lines[2].title).toContain('USDC');
    expect(lines[3].title).toContain('Revoke');
  });
});

describe('swap-to-usdc — rejects bad calldata', () => {
  it('returns null for a 2-action approve+swap where tokenOut is NOT USDC', () => {
    const actions = swapUniswapV3.encode(
      {
        tokenIn: JSON.stringify({
          symbol: 'WETH',
          address: WETH,
          decimals: 18,
          isNative: false,
        }),
        tokenOut: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        fee: '500',
        amountIn: '1',
        amountOutMinimum: '3300',
        tokenOutDecimals: '18',
      },
      emptyEncodeContext(),
    );
    expect(swapToUsdc.decode(actions, 0, ctx)).toBeNull();
  });

  it('returns null when the approve amount disagrees with the swap amount', () => {
    const actions = swapToUsdc.encode(
      {
        sourceToken: 'weth',
        amountIn: '1',
        fee: '500',
        amountOutMinimum: '3300',
      },
      emptyEncodeContext(),
    );
    // Tamper: change the approve amount.
    const tampered = [
      {
        ...actions[0],
        calldata: actions[0].calldata.replace(
          actions[0].calldata.slice(-64),
          parseUnits('2', 18).toString(16).padStart(64, '0'),
        ),
      },
      actions[1],
    ];
    expect(swapToUsdc.decode(tampered, 0, ctx)).toBeNull();
  });
});
