'use client';

/**
 * PalettePanel — color picker for Studio.
 *
 *  - Top: current color preview + hex input + native color input fallback.
 *  - Middle: the on-chain Descriptor palette (read via useDescriptorPalette).
 *  - Bottom: a per-project custom palette the user can build up with `+`.
 *
 * Clicking a swatch sets it as the active brush color. Right-click on a
 * custom swatch removes it.
 */

import { useState } from 'react';
import { useBrush } from '../model/brush';
import { usePalette } from '../model/palette';
import { useDescriptorPalette } from '../hooks/useDescriptorPalette';
import styles from './PalettePanel.module.css';

function isValidHex(hex: string): boolean {
  return /^#?[0-9a-fA-F]{6}$/.test(hex);
}

function normalizeHex(hex: string): string {
  const v = hex.startsWith('#') ? hex : `#${hex}`;
  return v.toLowerCase();
}

function isTransparent(color: string): boolean {
  // Treat the sentinel "#00000000" as transparent (the descriptor's index 0).
  return color.length === 9 && color.toLowerCase().endsWith('00');
}

export function PalettePanel() {
  const color = useBrush((s) => s.color);
  const setColor = useBrush((s) => s.setColor);
  const setPrevious = useBrush((s) => s.setPreviousColor);

  const custom = usePalette((s) => s.custom);
  const addCustom = usePalette((s) => s.addCustom);
  const removeCustom = usePalette((s) => s.removeCustom);

  const { palette: descriptor, isLoading, refetch } = useDescriptorPalette();

  const [hexInput, setHexInput] = useState(color);

  function pick(next: string): void {
    setPrevious(color);
    setColor(next);
    setHexInput(next);
  }

  function commitHex(): void {
    if (isValidHex(hexInput)) {
      const v = normalizeHex(hexInput);
      pick(v);
    } else {
      setHexInput(color);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.heading}>Palette</span>
      </div>

      <div className={styles.currentRow}>
        <span
          className={styles.swatch}
          style={{ background: color }}
          aria-label="current color"
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={commitHex}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className={styles.hexInput}
          spellCheck={false}
        />
        <input
          type="color"
          value={isValidHex(color) ? color : '#000000'}
          onChange={(e) => pick(e.target.value.toLowerCase())}
          className={styles.colorInput}
          aria-label="pick color"
        />
        <button
          type="button"
          className={styles.miniButton}
          onClick={() => {
            if (!isValidHex(color)) return;
            addCustom(color);
          }}
          title="Save to custom palette"
        >
          +
        </button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>On-chain</span>
          <button
            type="button"
            className={styles.miniButton}
            onClick={() => refetch()}
            disabled={isLoading}
            title="Reload from Descriptor"
          >
            {isLoading ? '…' : '⟳'}
          </button>
        </div>
        <div className={styles.swatchGrid}>
          {descriptor.length === 0 && (
            <span className={styles.emptyHint}>
              {isLoading ? 'Loading…' : 'No palette loaded'}
            </span>
          )}
          {descriptor.map((c, i) =>
            isTransparent(c) ? (
              <button
                key={`d-${i}`}
                type="button"
                className={`${styles.swatchCell} ${styles.transparentCell}`}
                title="Transparent (index 0)"
                aria-label="transparent"
                onClick={() => pick('#00000000')}
              />
            ) : (
              <button
                key={`d-${i}`}
                type="button"
                className={`${styles.swatchCell} ${c === color ? styles.swatchSelected : ''}`}
                style={{ background: c }}
                title={c}
                onClick={() => pick(c)}
                aria-label={c}
              />
            ),
          )}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Custom</span>
          {custom.length > 0 && (
            <span className={styles.hint}>right-click removes</span>
          )}
        </div>
        <div className={styles.swatchGrid}>
          {custom.length === 0 && (
            <span className={styles.emptyHint}>
              Click + to save the current color
            </span>
          )}
          {custom.map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.swatchCell} ${c === color ? styles.swatchSelected : ''}`}
              style={{ background: c }}
              title={c}
              onClick={() => pick(c)}
              onContextMenu={(e) => {
                e.preventDefault();
                removeCustom(c);
              }}
              aria-label={c}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
