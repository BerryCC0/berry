/**
 * Berry Studio artwork encoder — pixel array → on-chain Descriptor tuple.
 *
 * Attribution: algorithmic reference taken from Noundry's CC0-licensed
 * artworkEncoding.ts (https://github.com/volkyeth/noundry — apps/gallery/
 * src/app/propose/artworkEncoding.ts). Clean-room TypeScript reimplementation
 * with documentation and structural changes; behaves identically on the wire.
 *
 * Pipeline (matches NounsDescriptorV3.addAccessories / .addHeads / .addBodies
 * / .addGlasses):
 *
 *   1. Treat the 32×32 palette-indexed pixel array as a rectangular bitmap.
 *      Index 0 is transparent; non-zero values are visible.
 *   2. Crop to the non-transparent bounding box, recording {top, right+1,
 *      bottom, left}. (The on-chain reader expects right to be one pixel past
 *      the content edge — see SVGRenderer.sol.)
 *   3. Prepend a 5-byte metadata header: paletteIndex | top | right | bottom
 *      | left.
 *   4. RLE-encode the cropped pixels as alternating (count, colorIndex) byte
 *      pairs. A run is capped at 255.
 *   5. Wrap the resulting bytes as `bytes[]` (one element) via abi.encode, so
 *      the on-chain SSTORE2 storage layout matches what Descriptor expects.
 *   6. zlib-deflate (raw, no header) the abi-encoded blob with pako.
 *   7. Return {compressedBytes, decompressedLength, itemCount}.
 */

import { encodeAbiParameters } from "viem";
import { deflateRaw } from "pako";

const TRANSPARENT = 0;
const WIDTH = 32;
const HEIGHT = 32;

export interface EncodedTrait {
  compressedBytes: `0x${string}`;
  decompressedLength: bigint;
  itemCount: number;
}

export interface BoundedPixels {
  bounds: { top: number; right: number; bottom: number; left: number };
  pixels: number[];
}

function toHexByte(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 255) {
    throw new Error(`toHexByte: value ${n} out of range 0..255`);
  }
  return n.toString(16).padStart(2, "0");
}

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
 * Crop a 32×32 pixel array to its non-transparent bounding box.
 *
 * Returns the cropped pixels in row-major order and the bounds. Note `right`
 * is encoded as the exclusive edge (column index + 1), matching the on-chain
 * SVGRenderer expectation; all other bounds are inclusive.
 *
 * For a fully-transparent image, bounds collapse to `{top: HEIGHT-1, right:
 * 0, bottom: 0, left: WIDTH-1}` and pixels is empty. Mirrors Noundry behavior.
 */
export function packToBoundedPixels(pixels: number[]): BoundedPixels {
  if (pixels.length !== WIDTH * HEIGHT) {
    throw new Error(
      `packToBoundedPixels: expected ${WIDTH * HEIGHT} pixels, got ${pixels.length}`
    );
  }

  let top = HEIGHT - 1;
  let right = 0;
  let bottom = 0;
  let left = WIDTH - 1;
  const rows: number[][] = Array.from({ length: HEIGHT }, () => []);

  for (let i = 0; i < pixels.length; i++) {
    const pixel = pixels[i];
    const row = Math.floor(i / WIDTH);
    const col = i % WIDTH;
    rows[row].push(pixel);

    if (pixel !== TRANSPARENT) {
      if (row < top) top = row;
      if (row > bottom) bottom = row;
      if (col < left) left = col;
      if (col > right) right = col;
    }
  }

  const boundedPixels: number[] = [];
  // If the image is fully transparent, top/bottom/left/right remain in their
  // initial state and `slice` calls below correctly produce empty output.
  const isAllTransparent = top > bottom || left > right;
  if (!isAllTransparent) {
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        boundedPixels.push(rows[r][c]);
      }
    }
  }

  // The Descriptor stores `right` as the column past the last visible pixel.
  const rightExclusive = isAllTransparent ? right : right + 1;

  return {
    bounds: {
      top,
      right: rightExclusive,
      bottom,
      left,
    },
    pixels: boundedPixels,
  };
}

/**
 * RLE-encode a flat pixel array into a hex string (no `0x` prefix).
 *
 * Output is a sequence of (count, colorIndex) byte pairs. Counts are capped
 * at 255; a run longer than that is split into multiple pairs.
 */
export function rleEncode(pixels: number[]): string {
  if (pixels.length === 0) return "";

  const out: string[] = [];
  let previous = pixels[0];
  let count = 1;

  for (let i = 1; i < pixels.length; i++) {
    if (pixels[i] !== previous || count === 255) {
      out.push(toHexByte(count), toHexByte(previous));
      previous = pixels[i];
      count = 1;
    } else {
      count++;
    }
  }

  out.push(toHexByte(count), toHexByte(previous));
  return out.join("");
}

/**
 * Encode one image's metadata + RLE bytes (uncompressed).
 *
 * Output format (hex bytes):
 *   [paletteIndex][top][right][bottom][left][run0Count][run0Color]...
 */
export function encodeArtwork(
  pixels: number[],
  paletteIndex: number
): `0x${string}` {
  if (!Number.isInteger(paletteIndex) || paletteIndex < 0 || paletteIndex > 255) {
    throw new Error(`encodeArtwork: paletteIndex ${paletteIndex} out of range`);
  }

  const { bounds, pixels: bounded } = packToBoundedPixels(pixels);
  const metadata = [
    toHexByte(paletteIndex),
    toHexByte(bounds.top),
    toHexByte(bounds.right),
    toHexByte(bounds.bottom),
    toHexByte(bounds.left),
  ].join("");

  return `0x${metadata}${rleEncode(bounded)}`;
}

/**
 * Convert a 32×32 palette-indexed pixel array into the (bytes, uint80, uint16)
 * tuple that NounsDescriptorV3.addX(...) consumes.
 *
 * @param pixels - 1024 palette indices in row-major order. 0 = transparent.
 * @param paletteIndex - Which on-chain palette this trait targets (typically 0).
 */
export function compressAndEncodeTrait(
  pixels: number[],
  paletteIndex: number
): EncodedTrait {
  const encodedArtwork = encodeArtwork(pixels, paletteIndex);

  // Wrap as bytes[] (single element) — this is the layout NounsArt expects
  // after decompression.
  const abiEncoded = encodeAbiParameters(
    [{ type: "bytes[]" }],
    [[encodedArtwork]]
  );

  const abiBytes = hexToUint8Array(abiEncoded);
  const compressed = deflateRaw(abiBytes);
  const compressedHex = uint8ArrayToHex(compressed);

  return {
    compressedBytes: `0x${compressedHex}` as `0x${string}`,
    // `decompressedLength` is the byte length of the abi-encoded blob before
    // deflation. It's used on-chain to allocate the inflate buffer.
    decompressedLength: BigInt(abiBytes.length),
    itemCount: 1,
  };
}
