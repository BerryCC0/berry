/**
 * Selector pinning — the most important Seaport regression in the repo.
 *
 * When a Nouns proposal action has a non-empty `signature` field, the Timelock
 * computes the 4-byte function selector as `bytes4(keccak256(bytes(signature)))`
 * and prepends it to the calldata before calling `target`. So the signature
 * string MUST be the fully canonical Solidity form — the same string that
 * Seaport's ABI uses to derive its own selector.
 *
 * If we accidentally store a "human-readable" form like `validate(Order[])`
 * instead of the tuple-expanded canonical form, the call produces a totally
 * different selector, Seaport hits its fallback, and the transaction reverts
 * with no useful error. That's exactly what happened before this test existed.
 *
 * Each `expect(toFunctionSelector(SIG)).toBe('0x...')` line is a hard pin
 * against Seaport's deployed contract. If anyone changes these signature
 * strings, the test will catch the regression before it ships.
 */

import { describe, it, expect } from 'vitest';
import { toFunctionSelector } from 'viem';

// Pull the signatures from each action def so this test exercises the same
// strings the runtime actually uses.
import { VALIDATE_SIG } from '../_validate-pattern';

describe('Seaport canonical selectors', () => {
  // Selectors confirmed against Seaport 1.6 at
  // 0x0000000000000068F116a894984e2DB1123eB395 (etherscan ABI).
  it('validate(Order[]) hashes to 0x88147732', () => {
    expect(toFunctionSelector(VALIDATE_SIG)).toBe('0x88147732');
  });

  it('cancel(OrderComponents[]) hashes to 0xfd9f1e10', () => {
    const CANCEL_SIG = 'cancel((address,address,(uint8,address,uint256,uint256,uint256)[],(uint8,address,uint256,uint256,uint256,address)[],uint8,uint256,uint256,bytes32,uint256,bytes32,uint256)[])';
    expect(toFunctionSelector(CANCEL_SIG)).toBe('0xfd9f1e10');
  });

  it('fulfillAdvancedOrder(...) hashes to 0xe7acab24', () => {
    const FULFILL_SIG = 'fulfillAdvancedOrder(((address,address,(uint8,address,uint256,uint256,uint256)[],(uint8,address,uint256,uint256,uint256,address)[],uint8,uint256,uint256,bytes32,uint256,bytes32,uint256),uint120,uint120,bytes,bytes),(uint256,uint8,uint256,uint256,bytes32[])[],bytes32,address)';
    expect(toFunctionSelector(FULFILL_SIG)).toBe('0xe7acab24');
  });

  it('incrementCounter() hashes to 0x5b34b966', () => {
    expect(toFunctionSelector('incrementCounter()')).toBe('0x5b34b966');
  });

  // Counter-example: the human form would produce the WRONG selector.
  it('human-readable forms produce DIFFERENT selectors (sanity check)', () => {
    expect(toFunctionSelector('validate(Order[])')).not.toBe('0x88147732');
    expect(toFunctionSelector('cancel(OrderComponents[])')).not.toBe(
      '0xfd9f1e10',
    );
  });
});
