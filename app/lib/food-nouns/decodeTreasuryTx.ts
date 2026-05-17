/**
 * Server-side decoder for Food Nouns timelock transactions.
 *
 * Compound-style Timelock.executeTransaction(target, value, signature, data, eta).
 * Decoding strategy by case:
 *   1. signature empty + data empty                 → pure ETH transfer
 *   2. signature non-empty                          → parse signature, decode `data`
 *                                                     as ABI-encoded args (no full ABI
 *                                                     needed, no Etherscan call)
 *   3. signature empty + data non-empty (rare)      → fetch verified ABI from Etherscan
 *                                                     and decode via decodeFunctionData
 *   4. anything that throws                         → "unknown" with a hex preview
 *
 * ABI fetches are cached in-process per target address. The cache stores `null`
 * for unverified/missing-key lookups so we don't hammer Etherscan repeatedly.
 */

import 'server-only';
import {
  decodeAbiParameters,
  decodeFunctionData,
  parseAbiItem,
  type Abi,
  type AbiFunction,
  type AbiParameter,
  type Hex,
} from 'viem';

export interface DecodedInput {
  /** Parameter name if known (only ABI path; signature-only path has no names). */
  name?: string;
  type: string;
  /** Stringified value: addresses lowercased, uints as decimal strings, arrays JSON-stringified. */
  value: string;
  isAddress: boolean;
  /** Unsigned integer type — likely amount-like. */
  isAmount: boolean;
  isBytes: boolean;
  isArray: boolean;
}

export type DecodedTreasuryTx =
  | {
      kind: 'eth-transfer';
      target: string;
      valueWei: string;
    }
  | {
      kind: 'call';
      target: string;
      valueWei: string;
      functionName: string;
      inputs: DecodedInput[];
      /** How we obtained the inputs schema. */
      decodingSource: 'signature' | 'abi';
    }
  | {
      kind: 'unknown';
      target: string;
      valueWei: string;
      signature: string;
      /** First ~9 hex bytes of data, ellipsized. */
      dataPreview: string;
      reason: string;
    };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function decodeTreasuryTx({
  target,
  value,
  signature,
  data,
}: {
  target: string;
  value: bigint | string;
  signature: string | null | undefined;
  data: string | null | undefined;
}): Promise<DecodedTreasuryTx> {
  const valueWei = typeof value === 'bigint' ? value.toString() : String(value ?? '0');
  const targetLc = target.toLowerCase();
  const sig = (signature ?? '').trim();
  const dataHex = normalizeHex(data);

  // Case 1: pure ETH transfer
  if (!sig && (dataHex === '0x' || dataHex.length === 2)) {
    return { kind: 'eth-transfer', target: targetLc, valueWei };
  }

  // Case 2: signature-driven decoding (the common Compound timelock case)
  if (sig) {
    try {
      const parsed = parseAbiItem(`function ${sig}`);
      if (parsed.type !== 'function') {
        throw new Error('Parsed signature is not a function');
      }
      const inputs = (parsed.inputs ?? []) as readonly AbiParameter[];
      const decodedValues =
        inputs.length > 0 ? decodeAbiParameters(inputs, dataHex) : [];
      return {
        kind: 'call',
        target: targetLc,
        valueWei,
        functionName: parsed.name,
        inputs: toDecodedInputs(inputs, decodedValues),
        decodingSource: 'signature',
      };
    } catch (err) {
      return {
        kind: 'unknown',
        target: targetLc,
        valueWei,
        signature: sig,
        dataPreview: dataPreview(dataHex),
        reason: err instanceof Error ? err.message : 'signature decode failed',
      };
    }
  }

  // Case 3: empty signature + non-empty data → ABI fallback
  try {
    const abi = await fetchAbi(targetLc as Hex);
    if (!abi) {
      return {
        kind: 'unknown',
        target: targetLc,
        valueWei,
        signature: '',
        dataPreview: dataPreview(dataHex),
        reason: 'no verified ABI available',
      };
    }
    const { functionName, args } = decodeFunctionData({ abi, data: dataHex });
    const fn = abi.find(
      (item): item is AbiFunction =>
        item.type === 'function' && item.name === functionName,
    );
    const inputs = (fn?.inputs ?? []) as readonly AbiParameter[];
    return {
      kind: 'call',
      target: targetLc,
      valueWei,
      functionName,
      inputs: toDecodedInputs(inputs, (args ?? []) as readonly unknown[]),
      decodingSource: 'abi',
    };
  } catch (err) {
    return {
      kind: 'unknown',
      target: targetLc,
      valueWei,
      signature: '',
      dataPreview: dataPreview(dataHex),
      reason: err instanceof Error ? err.message : 'abi decode failed',
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeHex(d: string | null | undefined): Hex {
  if (!d) return '0x';
  const s = d.startsWith('0x') ? d : `0x${d}`;
  return s as Hex;
}

function dataPreview(d: string): string {
  if (!d || d === '0x') return '0x';
  // 2 chars for "0x" + 16 hex chars = first 8 bytes
  if (d.length <= 18) return d;
  return `${d.slice(0, 18)}…`;
}

function toDecodedInputs(
  inputs: readonly AbiParameter[],
  values: readonly unknown[],
): DecodedInput[] {
  return inputs.map((p, i) => {
    const type = p.type;
    const isAddress = type === 'address' || type === 'address[]';
    const isAmount = /^uint\d*$/.test(type);
    const isBytes = type === 'bytes' || /^bytes\d+$/.test(type);
    const isArray = type.endsWith('[]') || type === 'tuple[]';
    return {
      name: p.name && p.name.length > 0 ? p.name : undefined,
      type,
      value: stringifyValue(values[i], type),
      isAddress,
      isAmount,
      isBytes,
      isArray,
    };
  });
}

function stringifyValue(v: unknown, type: string): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'string') {
    return type === 'address' ? v.toLowerCase() : v;
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    return JSON.stringify(
      v.map((x) => (typeof x === 'bigint' ? x.toString() : x)),
    );
  }
  // Tuples / objects
  try {
    return JSON.stringify(v, (_k, val) =>
      typeof val === 'bigint' ? val.toString() : val,
    );
  } catch {
    return String(v);
  }
}

// ---------------------------------------------------------------------------
// Etherscan ABI cache
// ---------------------------------------------------------------------------

/**
 * Per-process cache. `null` means "we tried and there's no verified ABI"; we
 * remember that to avoid re-querying Etherscan on every request.
 */
const abiCache = new Map<string, Abi | null>();

async function fetchAbi(address: Hex): Promise<Abi | null> {
  const key = address.toLowerCase();
  const hit = abiCache.get(key);
  if (hit !== undefined) return hit;

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    abiCache.set(key, null);
    return null;
  }

  try {
    const url = new URL('https://api.etherscan.io/v2/api');
    url.searchParams.set('chainid', '1');
    url.searchParams.set('module', 'contract');
    url.searchParams.set('action', 'getabi');
    url.searchParams.set('address', address);
    url.searchParams.set('apikey', apiKey);

    // Cache verified contracts aggressively — they rarely change shape.
    const res = await fetch(url, { next: { revalidate: 86_400 } });
    if (!res.ok) {
      abiCache.set(key, null);
      return null;
    }
    const json = (await res.json()) as { status?: string; result?: string };
    if (json.status !== '1' || typeof json.result !== 'string') {
      abiCache.set(key, null);
      return null;
    }
    const abi = JSON.parse(json.result) as Abi;
    abiCache.set(key, abi);
    return abi;
  } catch {
    abiCache.set(key, null);
    return null;
  }
}
