/**
 * Sync Trait Art
 *
 * Reads on-chain trait counts from the Nouns Descriptor and appends any new
 * trait bytes to app/lib/nouns/utils/image-data.ts. New entries get placeholder
 * filenames (e.g., accessory-new-145) that should be renamed before merging.
 *
 * Usage: node scripts/sync-trait-art.js
 * Env:   RPC_URL (optional, defaults to a public Ethereum RPC)
 */

const fs = require('fs');
const path = require('path');
const { createPublicClient, http } = require('viem');
const { mainnet } = require('viem/chains');

const DESCRIPTOR = '0x33a9c445fb4fb21f2c030a6b2d3e2f12d017bfac';
const IMAGE_DATA_PATH = path.join(__dirname, '..', 'app', 'lib', 'nouns', 'utils', 'image-data.ts');

const CATEGORIES = [
  { key: 'bodies',      singular: 'body',      countFn: 'bodyCount',      readFn: 'bodies' },
  { key: 'accessories', singular: 'accessory', countFn: 'accessoryCount', readFn: 'accessories' },
  { key: 'heads',       singular: 'head',      countFn: 'headCount',      readFn: 'heads' },
  { key: 'glasses',     singular: 'glasses',   countFn: 'glassesCount',   readFn: 'glasses' },
];

const ABI = CATEGORIES.flatMap((c) => [
  { name: c.countFn, inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { name: c.readFn,  inputs: [{ type: 'uint256' }], outputs: [{ type: 'bytes' }], stateMutability: 'view', type: 'function' },
]);

// Walk the category array, ignoring contents of strings, to find its matching ].
function locateCategory(src, key) {
  const keyIdx = src.indexOf(`"${key}": [`);
  if (keyIdx === -1) throw new Error(`Category not found: ${key}`);
  let i = src.indexOf('[', keyIdx);
  let depth = 0;
  let inStr = false;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) break;
    }
  }
  const block = src.slice(keyIdx, i + 1);
  return { count: (block.match(/"filename"/g) || []).length, closeIdx: i };
}

function appendEntries(src, key, entries) {
  const { closeIdx } = locateCategory(src, key);
  const lineStart = src.lastIndexOf('\n', closeIdx) + 1;
  const closeIndent = src.slice(lineStart, closeIdx);
  const itemIndent = closeIndent + '    ';
  const propIndent = itemIndent + '    ';
  const lastBrace = src.lastIndexOf('}', closeIdx);

  const insertion = entries.map((e) =>
    `,\n${itemIndent}{\n${propIndent}"filename": "${e.filename}",\n${propIndent}"data": "${e.data}"\n${itemIndent}}`
  ).join('');

  return src.slice(0, lastBrace + 1) + insertion + src.slice(lastBrace + 1);
}

async function main() {
  const rpcUrl = process.env.RPC_URL || 'https://ethereum-rpc.publicnode.com';
  const client = createPublicClient({ chain: mainnet, transport: http(rpcUrl) });

  let src = fs.readFileSync(IMAGE_DATA_PATH, 'utf8');
  let totalAdded = 0;
  const summary = [];

  for (const cat of CATEGORIES) {
    const onchain = Number(await client.readContract({
      address: DESCRIPTOR, abi: ABI, functionName: cat.countFn,
    }));
    const local = locateCategory(src, cat.key).count;

    if (onchain === local) {
      console.log(`  ${cat.key}: ${local} (in sync)`);
      continue;
    }
    if (onchain < local) {
      console.warn(`! ${cat.key}: local=${local}, on-chain=${onchain} — local is ahead, skipping`);
      continue;
    }

    console.log(`+ ${cat.key}: local=${local}, on-chain=${onchain}, fetching ${onchain - local}...`);
    const indices = Array.from({ length: onchain - local }, (_, k) => local + k);
    const fetched = await Promise.all(indices.map((i) =>
      client.readContract({ address: DESCRIPTOR, abi: ABI, functionName: cat.readFn, args: [BigInt(i)] })
    ));

    const entries = fetched.map((data, idx) => ({
      filename: `${cat.singular}-new-${indices[idx]}`,
      data,
    }));

    src = appendEntries(src, cat.key, entries);
    totalAdded += entries.length;
    summary.push(`${entries.length} ${cat.key}`);
  }

  if (totalAdded === 0) {
    console.log('\nNo changes needed.');
    return;
  }

  fs.writeFileSync(IMAGE_DATA_PATH, src);
  console.log(`\nWrote ${totalAdded} new entries: ${summary.join(', ')}`);
  console.log('Remember to rename the placeholder filenames before merging.');
}

main().catch((err) => { console.error(err); process.exit(1); });
