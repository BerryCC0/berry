/**
 * Encoder/decoder round-trip and known-shape tests.
 *
 * Attribution: pipeline behavior cross-checked against Noundry's CC0
 * reference implementation at https://github.com/volkyeth/noundry.
 */

import { describe, it, expect } from "vitest";
import {
  compressAndEncodeTrait,
  encodeArtwork,
  packToBoundedPixels,
  rleEncode,
} from "../encoder";
import { decodeTrait, rleDecode } from "../decoder";

const WIDTH = 32;
const HEIGHT = 32;
const TOTAL = WIDTH * HEIGHT;

function blankCanvas(): number[] {
  return new Array<number>(TOTAL).fill(0);
}

function setPixel(canvas: number[], x: number, y: number, value: number): void {
  canvas[y * WIDTH + x] = value;
}

describe("rleEncode / rleDecode", () => {
  it("round-trips a uniform run", () => {
    const pixels = new Array<number>(10).fill(7);
    const encoded = rleEncode(pixels);
    expect(encoded).toBe("0a07");
    expect(rleDecode(encoded)).toEqual(pixels);
  });

  it("splits runs longer than 255 into multiple pairs", () => {
    const pixels = new Array<number>(300).fill(3);
    const encoded = rleEncode(pixels);
    // 255 of color 3, then 45 of color 3
    expect(encoded).toBe("ff03" + "2d03");
    expect(rleDecode(encoded)).toEqual(pixels);
  });

  it("round-trips mixed runs", () => {
    const pixels = [1, 1, 1, 2, 2, 5];
    const encoded = rleEncode(pixels);
    expect(rleDecode(encoded)).toEqual(pixels);
  });

  it("handles empty input", () => {
    expect(rleEncode([])).toBe("");
    expect(rleDecode("")).toEqual([]);
  });
});

describe("packToBoundedPixels", () => {
  it("computes the bounding box of a single-pixel trait", () => {
    const canvas = blankCanvas();
    setPixel(canvas, 10, 5, 1);
    const { bounds, pixels } = packToBoundedPixels(canvas);

    expect(bounds).toEqual({ top: 5, right: 11, bottom: 5, left: 10 });
    expect(pixels).toEqual([1]);
  });

  it("returns full-canvas bounds for a fully-painted image", () => {
    const canvas = new Array<number>(TOTAL).fill(1);
    const { bounds, pixels } = packToBoundedPixels(canvas);

    expect(bounds).toEqual({ top: 0, right: WIDTH, bottom: HEIGHT - 1, left: 0 });
    expect(pixels.length).toBe(TOTAL);
    expect(pixels.every((p) => p === 1)).toBe(true);
  });

  it("crops surrounding transparent margin", () => {
    const canvas = blankCanvas();
    setPixel(canvas, 4, 4, 1);
    setPixel(canvas, 5, 4, 2);
    setPixel(canvas, 4, 5, 3);
    setPixel(canvas, 5, 5, 4);
    const { bounds, pixels } = packToBoundedPixels(canvas);

    expect(bounds).toEqual({ top: 4, right: 6, bottom: 5, left: 4 });
    expect(pixels).toEqual([1, 2, 3, 4]);
  });
});

describe("encodeArtwork", () => {
  it("produces a hex string starting with the metadata header", () => {
    const canvas = blankCanvas();
    setPixel(canvas, 0, 0, 1);
    const encoded = encodeArtwork(canvas, 0);

    expect(encoded.startsWith("0x")).toBe(true);
    expect(encoded.length).toBeGreaterThan(2 + 10); // header is 5 bytes = 10 hex chars
    // First byte after 0x is paletteIndex (0)
    expect(encoded.slice(2, 4)).toBe("00");
    // top=0, right=1, bottom=0, left=0
    expect(encoded.slice(4, 12)).toBe("00010000");
  });
});

describe("compressAndEncodeTrait → decodeTrait round-trip", () => {
  it("round-trips a checkerboard pattern", () => {
    const canvas = blankCanvas();
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        if ((x + y) % 2 === 0) {
          setPixel(canvas, x, y, 1);
        }
      }
    }

    const encoded = compressAndEncodeTrait(canvas, 0);
    expect(encoded.compressedBytes.startsWith("0x")).toBe(true);
    expect(encoded.compressedBytes.length % 2).toBe(0);
    expect(encoded.itemCount).toBe(1);
    expect(encoded.decompressedLength > BigInt(0)).toBe(true);

    const decoded = decodeTrait(encoded.compressedBytes);
    expect(decoded.paletteIndex).toBe(0);
    expect(decoded.pixels).toEqual(canvas);
  });

  it("round-trips an empty (all transparent) trait", () => {
    const canvas = blankCanvas();

    const encoded = compressAndEncodeTrait(canvas, 0);
    expect(encoded.itemCount).toBe(1);
    expect(encoded.decompressedLength > BigInt(0)).toBe(true);

    const decoded = decodeTrait(encoded.compressedBytes);
    expect(decoded.paletteIndex).toBe(0);
    expect(decoded.pixels).toEqual(canvas);
  });

  it("round-trips a single-pixel trait with correct bounds", () => {
    const canvas = blankCanvas();
    setPixel(canvas, 17, 23, 9);

    const encoded = compressAndEncodeTrait(canvas, 2);
    const decoded = decodeTrait(encoded.compressedBytes);
    expect(decoded.paletteIndex).toBe(2);
    expect(decoded.pixels[23 * WIDTH + 17]).toBe(9);
    expect(decoded.pixels.filter((p) => p !== 0).length).toBe(1);
    expect(decoded.pixels).toEqual(canvas);
  });

  it("round-trips a fully-painted trait", () => {
    const canvas = new Array<number>(TOTAL).fill(1);

    const encoded = compressAndEncodeTrait(canvas, 0);
    const decoded = decodeTrait(encoded.compressedBytes);
    expect(decoded.paletteIndex).toBe(0);
    expect(decoded.pixels).toEqual(canvas);
  });

  it("round-trips a multi-color irregular shape", () => {
    const canvas = blankCanvas();
    // diagonal stripe of different colors
    for (let i = 0; i < 16; i++) {
      setPixel(canvas, i + 4, i + 4, ((i % 5) + 1));
    }
    // a few isolated pixels at the edges
    setPixel(canvas, 0, 0, 7);
    setPixel(canvas, 31, 31, 8);

    const encoded = compressAndEncodeTrait(canvas, 1);
    const decoded = decodeTrait(encoded.compressedBytes);
    expect(decoded.paletteIndex).toBe(1);
    expect(decoded.pixels).toEqual(canvas);
  });

  it("propagates paletteIndex through the round-trip", () => {
    const canvas = blankCanvas();
    setPixel(canvas, 5, 5, 1);

    for (const paletteIndex of [0, 1, 7, 255]) {
      const encoded = compressAndEncodeTrait(canvas, paletteIndex);
      const decoded = decodeTrait(encoded.compressedBytes);
      expect(decoded.paletteIndex).toBe(paletteIndex);
    }
  });
});

describe("compressAndEncodeTrait output shape", () => {
  it("returns lowercase even-length 0x-prefixed hex", () => {
    const canvas = blankCanvas();
    setPixel(canvas, 0, 0, 1);
    const { compressedBytes } = compressAndEncodeTrait(canvas, 0);
    expect(compressedBytes).toMatch(/^0x[0-9a-f]+$/);
    expect(compressedBytes.length % 2).toBe(0);
  });
});
