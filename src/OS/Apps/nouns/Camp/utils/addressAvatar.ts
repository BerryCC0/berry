/**
 * addressAvatar — Deterministic pixel-art avatars from Ethereum addresses
 *
 * Generates a blockies-style 8×8 pixel grid as an SVG data URI.
 * Each address always produces the same avatar. Zero dependencies.
 *
 * The algorithm:
 *   1. Hash the lowercase address into a seed (simple xorshift PRNG)
 *   2. Pick a foreground and background color from the seed
 *   3. Fill an 8×8 grid, mirrored horizontally (4 columns → 8)
 *   4. Encode as a compact SVG data URI
 *
 * Based on the ethereum-blockies algorithm by Alex Van de Sande.
 */

// ---------------------------------------------------------------------------
// Seeded PRNG (xorshift128)
// ---------------------------------------------------------------------------

function createPrng(seed: string): () => number {
  // MurmurHash3-style seed mixer → 4 × 32-bit state for xorshift128
  const s = new Int32Array(4);
  for (let i = 0; i < seed.length; i++) {
    s[i % 4] = (s[i % 4] + seed.charCodeAt(i)) | 0;
    let h = s[i % 4];
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    s[i % 4] = h ^ (h >>> 16);
  }
  // Ensure non-zero state (xorshift requires it)
  if (s[0] === 0 && s[1] === 0 && s[2] === 0 && s[3] === 0) {
    s[0] = 1;
  }

  return () => {
    // xorshift128
    let t = s[0] ^ (s[0] << 11);
    s[0] = s[1];
    s[1] = s[2];
    s[2] = s[3];
    s[3] = (s[3] ^ (s[3] >>> 19) ^ t ^ (t >>> 8));
    return (s[3] >>> 0) / 0x100000000; // [0, 1)
  };
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else              { r = c; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function pickColor(rand: () => number): string {
  const h = Math.floor(rand() * 360);
  const s = 0.4 + rand() * 0.2;   // 40-60% saturation — vibrant but not neon
  const l = 0.35 + rand() * 0.2;  // 35-55% lightness — readable on light & dark
  return rgbHex(...hsl2rgb(h, s, l));
}

// ---------------------------------------------------------------------------
// Grid generation
// ---------------------------------------------------------------------------

const SIZE = 8;      // 8×8 pixel grid
const HALF = SIZE / 2; // Mirror axis

function generateGrid(rand: () => number): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < SIZE; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < HALF; x++) {
      row.push(rand() >= 0.5);
    }
    // Mirror horizontally
    for (let x = HALF - 1; x >= 0; x--) {
      row.push(row[x]);
    }
    grid.push(row);
  }
  return grid;
}

// ---------------------------------------------------------------------------
// SVG encoding
// ---------------------------------------------------------------------------

/**
 * Generate a blockies-style avatar as an SVG data URI.
 *
 * @param address  Ethereum address (0x...)
 * @returns        `data:image/svg+xml,...` URI suitable for <img src>
 */
export function addressToAvatar(address: string): string {
  const seed = address.toLowerCase();
  const rand = createPrng(seed);

  const fg = pickColor(rand);
  const bg = pickColor(rand);
  const spot = pickColor(rand); // Accent color for ~30% of "on" pixels

  const grid = generateGrid(rand);

  // Build SVG rects — only emit foreground/spot pixels (bg is the fill)
  let rects = '';
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (grid[y][x]) {
        const color = rand() < 0.3 ? spot : fg;
        rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
      }
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="crispEdges">` +
    `<rect width="${SIZE}" height="${SIZE}" fill="${bg}"/>` +
    rects +
    `</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
