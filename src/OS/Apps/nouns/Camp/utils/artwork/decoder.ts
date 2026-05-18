/**
 * Berry Studio artwork decoder — on-chain Descriptor blob → pixel array.
 *
 * Attribution: algorithmic reference taken from Noundry's CC0-licensed
 * artworkEncoding.ts (https://github.com/volkyeth/noundry — apps/gallery/
 * src/app/propose/artworkEncoding.ts). Clean-room TypeScript reimplementation.
 *
 * Inverse of compressAndEncodeTrait. The Descriptor exposes traits via
 * `heads(uint256)`, `bodies(uint256)`, etc. — each returns the compressed
 * bytes blob that was originally written. We inflate it, ABI-decode the
 * bytes[], parse the metadata header, and reconstruct the 32×32 pixel grid.
 */

import { decodeAbiParameters } from "viem";
import { inflateRaw } from "pako";

const TRANSPARENT = 0;
const WIDTH = 32;
const HEIGHT = 32;

function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error(`hexToUint8Array: odd-length hex string`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return out;
}

function uint8ArrayToHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, "0");
  }
  return s;
}

/**
 * Decode RLE-encoded hex back into a flat pixel array.
 *
 * Input is a sequence of (count, colorIndex) byte pairs as a hex string with
 * no `0x` prefix. Output length = sum of counts.
 */
export function rleDecode(encoded: string): number[] {
  if (encoded.length % 4 !== 0) {
    throw new Error(`rleDecode: hex length ${encoded.length} not divisible by 4`);
  }
  const out: number[] = [];
  for (let i = 0; i < encoded.length; i += 4) {
    const count = parseInt(encoded.slice(i, i + 2), 16);
    const colorIndex = parseInt(encoded.slice(i + 2, i + 4), 16);
    for (let j = 0; j < count; j++) out.push(colorIndex);
  }
  return out;
}

/**
 * Reconstruct a 32×32 pixel array from bounds + cropped pixels by padding
 * with transparent pixels.
 */
function unpackBoundedPixels(
  bounded: number[],
  bounds: { top: number; right: number; bottom: number; left: number }
): number[] {
  const { top, right, bottom, left } = bounds;
  // The encoder stores `right` as exclusive (one past the last visible pixel),
  // matching the on-chain renderer's convention.
  const rightInclusive = right - 1;

  const out = new Array<number>(WIDTH * HEIGHT).fill(TRANSPARENT);
  if (bounded.length === 0) return out;

  const rowWidth = rightInclusive - left + 1;
  for (let r = 0; r <= bottom - top; r++) {
    for (let c = 0; c < rowWidth; c++) {
      const pixel = bounded[r * rowWidth + c];
      const idx = (top + r) * WIDTH + (left + c);
      out[idx] = pixel;
    }
  }
  return out;
}

/**
 * Decode the compressed bytes blob returned by Descriptor.heads(i) / etc.
 * into a 32×32 palette-indexed pixel array.
 *
 * Used by the Studio's "Fork trait" feature to load existing on-chain traits
 * into the editor.
 */
export function decodeTrait(compressedBytes: `0x${string}`): {
  pixels: number[];
  paletteIndex: number;
} {
  const compressed = hexToUint8Array(compressedBytes);
  const inflated = inflateRaw(compressed);
  const abiHex = `0x${uint8ArrayToHex(inflated)}` as `0x${string}`;

  // bytes[] (single element holds the encoded artwork)
  const [items] = decodeAbiParameters(
    [{ type: "bytes[]" }],
    abiHex
  ) as readonly [readonly `0x${string}`[]];

  if (items.length === 0) {
    throw new Error("decodeTrait: ABI-decoded bytes[] is empty");
  }

  const encodedArtwork = items[0];
  const hex = encodedArtwork.startsWith("0x")
    ? encodedArtwork.slice(2)
    : encodedArtwork;

  if (hex.length < 10) {
    throw new Error(
      `decodeTrait: encoded artwork shorter than 5-byte header (got ${hex.length / 2} bytes)`
    );
  }

  const paletteIndex = parseInt(hex.slice(0, 2), 16);
  const top = parseInt(hex.slice(2, 4), 16);
  const right = parseInt(hex.slice(4, 6), 16);
  const bottom = parseInt(hex.slice(6, 8), 16);
  const left = parseInt(hex.slice(8, 10), 16);

  const boundedPixels = rleDecode(hex.slice(10));
  const pixels = unpackBoundedPixels(boundedPixels, {
    top,
    right,
    bottom,
    left,
  });

  return { pixels, paletteIndex };
}
