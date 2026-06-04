'use client';

/**
 * PalettePanel — color picker for Studio.
 *
 *  - Top: current color preview + selected hex display.
 *  - Middle: the Descriptor palette (read via useDescriptorPalette).
 *
 * Clicking a swatch sets it as the active brush color.
 */

import { useMemo } from 'react';
import { useBrush } from '../model/brush';
import { useDescriptorPalette } from '../hooks/useDescriptorPalette';
import styles from './PalettePanel.module.css';

function isTransparent(color: string): boolean {
  // Treat the sentinel "#00000000" as transparent (the descriptor's index 0).
  return color.length === 9 && color.toLowerCase().endsWith('00');
}

type PaletteColor = { color: string; index: number };
type PaletteGroupId =
  | 'transparent'
  | 'whites'
  | 'grays'
  | 'blues'
  | 'cyans'
  | 'greens'
  | 'yellows'
  | 'reds'
  | 'purples'
  | 'oranges'
  | 'other';

const PALETTE_GROUPS: Array<{ id: PaletteGroupId; label: string }> = [
  { id: 'transparent', label: 'Transparent' },
  { id: 'whites', label: 'Whites' },
  { id: 'grays', label: 'Grays' },
  { id: 'blues', label: 'Blues' },
  { id: 'cyans', label: 'Cyans' },
  { id: 'greens', label: 'Greens' },
  { id: 'yellows', label: 'Yellows' },
  { id: 'reds', label: 'Reds + Pinks' },
  { id: 'purples', label: 'Purples' },
  { id: 'oranges', label: 'Oranges + Browns' },
  { id: 'other', label: 'Other' },
];

function parseRgb(color: string): { r: number; g: number; b: number } | null {
  if (isTransparent(color)) return null;
  let hex = color.trim().toLowerCase();
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length !== 6) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)
    ? null
    : { r, g, b };
}

function hueFromRgb(r: number, g: number, b: number): number {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  if (delta === 0) return 0;
  let hue = 0;
  if (max === rn) hue = ((gn - bn) / delta) % 6;
  else if (max === gn) hue = (bn - rn) / delta + 2;
  else hue = (rn - gn) / delta + 4;
  return (hue * 60 + 360) % 360;
}

function classifyColor(color: string): PaletteGroupId {
  if (isTransparent(color)) return 'transparent';
  const rgb = parseRgb(color);
  if (!rgb) return 'other';
  const { r, g, b } = rgb;
  const avg = (r + g + b) / 3;
  const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  if (avg > 220 && maxDiff < 32) return 'whites';
  if (maxDiff < 32) return 'grays';

  const hue = hueFromRgb(r, g, b);
  if (hue >= 185 && hue < 255) return 'blues';
  if (hue >= 165 && hue < 185) return 'cyans';
  if (hue >= 80 && hue < 165) return 'greens';
  if (hue >= 48 && hue < 80) return 'yellows';
  if (hue >= 255 && hue < 315) return 'purples';
  if (hue >= 315 || hue < 18) return 'reds';
  if (hue >= 18 && hue < 48) return 'oranges';
  return 'other';
}

function groupPalette(colors: string[]) {
  const grouped = new Map<PaletteGroupId, PaletteColor[]>(
    PALETTE_GROUPS.map((group) => [group.id, []]),
  );
  colors.forEach((color, index) => {
    grouped.get(classifyColor(color))?.push({ color, index });
  });
  return PALETTE_GROUPS.map((group) => ({
    ...group,
    colors: grouped.get(group.id) ?? [],
  })).filter((group) => group.colors.length > 0);
}

export function PalettePanel() {
  const color = useBrush((s) => s.color);
  const previous = useBrush((s) => s.previousColor);
  const setColor = useBrush((s) => s.setColor);
  const setPrevious = useBrush((s) => s.setPreviousColor);

  const { palette: descriptor, isLoading } = useDescriptorPalette();
  const descriptorGroups = useMemo(
    () => groupPalette(descriptor),
    [descriptor],
  );

  function pick(next: string): void {
    setPrevious(color);
    setColor(next);
  }

  function swapPrevious(): void {
    if (!previous || previous === color) return;
    pick(previous);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.heading}>Palette</span>
      </div>

      <div className={styles.currentRow}>
        <div className={styles.swatchPair}>
          <span
            className={styles.swatch}
            style={{ background: color }}
            aria-label="current color"
          />
          <button
            type="button"
            className={styles.swatchPrev}
            style={{ background: previous }}
            onClick={swapPrevious}
            title="Swap with previous color"
            aria-label="previous color"
          />
        </div>
        <span className={styles.hexValue} aria-label="selected color hex">
          {color}
        </span>
      </div>

      <div className={styles.section}>
        <div className={styles.groupedPalette}>
          {descriptor.length === 0 && (
            <span className={styles.emptyHint}>
              {isLoading ? 'Loading…' : 'No palette loaded'}
            </span>
          )}
          {descriptorGroups.map((group) => (
            <div key={group.id} className={styles.paletteGroup}>
              <div className={styles.paletteGroupTitle}>{group.label}</div>
              <div className={styles.swatchGrid}>
                {group.colors.map(({ color: c, index }) =>
                  isTransparent(c) ? (
                    <button
                      key={`d-${index}`}
                      type="button"
                      className={`${styles.swatchCell} ${styles.transparentCell}`}
                      title="Transparent (index 0)"
                      aria-label="transparent"
                      onClick={() => pick('#00000000')}
                    />
                  ) : (
                    <button
                      key={`d-${index}`}
                      type="button"
                      className={`${styles.swatchCell} ${
                        c === color ? styles.swatchSelected : ''
                      }`}
                      style={{ background: c }}
                      title={`${group.label}: ${c}`}
                      onClick={() => pick(c)}
                      aria-label={c}
                    />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
