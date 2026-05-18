/**
 * ArtworkTraitWizard
 *
 * 5-step wizard rendered inside ActionEditorModal when the active template's
 * field type is 'artwork-trait'. Walks the artist through: source pick →
 * palette validation → metadata → CC0 signature → final confirmation.
 *
 * Output is a JSON-stringified payload (see ArtworkTraitPayload below) that
 * carries everything the generator needs to emit the on-chain calldata plus
 * everything the proposal description needs to render the signed agreement.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { recoverMessageAddress } from 'viem';
import { useAccount, useSignMessage } from 'wagmi';
import { ImageData as NounsImageData } from '@/app/lib/nouns/utils/image-data';
import {
  compressAndEncodeTrait,
  generateAgreementMarkdown,
  generateAgreementText,
  nearestPaletteIndex,
  parseHexColor,
} from '../../utils/artwork';
import styles from './ArtworkTraitWizard.module.css';

const CANVAS_WIDTH = 32;
const CANVAS_HEIGHT = 32;
const TOTAL_PIXELS = CANVAS_WIDTH * CANVAS_HEIGHT;

export type TraitType = 'head' | 'body' | 'accessory' | 'glasses';

export interface ArtworkTraitPayload {
  traitType: TraitType;
  paletteIndex: number;
  pixels: number[];
  paletteSnapshot: string[];
  contributionName: string;
  contributionSpec: string;
  signer: `0x${string}`;
  signature: `0x${string}`;
  agreementText: string;
  thumbnailDataUrl: string;
  encodedBytes: `0x${string}`;
  decompressedLength: string;
  itemCount: number;
  generatedMarkdown: string;
  /** Set by the parser when round-tripping calldata back into the wizard. */
  readOnly?: boolean;
}

interface ArtworkTraitWizardProps {
  traitType: TraitType;
  value: string;
  onChange: (value: string) => void;
  /**
   * Optional callback for parents that want the generated CC0 markdown
   * automatically appended to the proposal description. CreateProposalView
   * wires this up to the form's setDescription helper.
   */
  onAppendDescription?: (markdown: string) => void;
  disabled?: boolean;
}

/**
 * Build the on-chain palette as a normalised lowercase #rrggbb list. Index 0
 * is the transparent slot; ImageData has an empty string there which we map
 * to a sentinel so distance computation never accidentally snaps to it.
 */
function buildDescriptorPalette(): string[] {
  return NounsImageData.palette.map((hex, idx) => {
    if (idx === 0 || !hex) return '';
    const clean = hex.startsWith('#') ? hex.slice(1) : hex;
    return `#${clean.toLowerCase()}`;
  });
}

/**
 * Decode a 32×32 PNG file into a flat array of palette indices using the
 * Nouns descriptor palette. Returns the indices and the unique hex colours
 * encountered, so step 2 can report mismatches.
 */
async function decodePngToPixels(
  file: File,
): Promise<{
  pixels: number[];
  paletteUsed: string[];
  rawRgba: Uint8ClampedArray;
  dataUrl: string;
}> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Failed to decode image'));
    i.src = dataUrl;
  });

  if (img.naturalWidth !== CANVAS_WIDTH || img.naturalHeight !== CANVAS_HEIGHT) {
    throw new Error(
      `Image must be exactly ${CANVAS_WIDTH}×${CANVAS_HEIGHT} pixels (got ${img.naturalWidth}×${img.naturalHeight})`,
    );
  }

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const rgba = imageData.data;

  const pixels = new Array<number>(TOTAL_PIXELS).fill(0);
  const uniqueHex = new Set<string>();

  const descriptorPalette = buildDescriptorPalette();
  // Direct lookup table for known palette colours — short-circuits the
  // nearest-color search when the PNG already uses exact descriptor colours.
  const directLookup = new Map<string, number>();
  for (let i = 1; i < descriptorPalette.length; i++) {
    if (descriptorPalette[i]) directLookup.set(descriptorPalette[i], i);
  }

  for (let i = 0; i < TOTAL_PIXELS; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const a = rgba[i * 4 + 3];

    if (a === 0) {
      pixels[i] = 0;
      continue;
    }

    const hex = `#${[r, g, b]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')}`;
    uniqueHex.add(hex);
    const direct = directLookup.get(hex);
    pixels[i] = direct ?? -1; // -1 marks "out of palette" for step 2
  }

  return {
    pixels,
    paletteUsed: Array.from(uniqueHex),
    rawRgba: rgba,
    dataUrl,
  };
}

/**
 * Render a flat palette-indexed pixel array to a data URL preview using the
 * given palette (for step 5 thumbnail / confirm-screen display).
 */
function renderPreview(pixels: number[], palette: string[]): string {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);
  for (let i = 0; i < pixels.length; i++) {
    const idx = pixels[i];
    if (idx <= 0) {
      img.data[i * 4] = 0;
      img.data[i * 4 + 1] = 0;
      img.data[i * 4 + 2] = 0;
      img.data[i * 4 + 3] = 0;
      continue;
    }
    const hex = palette[idx];
    if (!hex) {
      img.data[i * 4 + 3] = 0;
      continue;
    }
    try {
      const c = parseHexColor(hex);
      img.data[i * 4] = c.r;
      img.data[i * 4 + 1] = c.g;
      img.data[i * 4 + 2] = c.b;
      img.data[i * 4 + 3] = 255;
    } catch {
      img.data[i * 4 + 3] = 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

function truncateHex(hex: string, head = 10, tail = 6): string {
  if (!hex) return '';
  if (hex.length <= head + tail + 1) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

export function ArtworkTraitWizard({
  traitType,
  value,
  onChange,
  onAppendDescription,
  disabled = false,
}: ArtworkTraitWizardProps) {
  // Try to hydrate from any existing payload (drafts, parser round-trip).
  const initialPayload = useMemo<Partial<ArtworkTraitPayload>>(() => {
    if (!value) return {};
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }, [value]);

  const descriptorPalette = useMemo(buildDescriptorPalette, []);
  const isReadOnly = initialPayload.readOnly === true;

  const [open, setOpen] = useState<boolean>(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [pixels, setPixels] = useState<number[]>(
    Array.isArray(initialPayload.pixels) && initialPayload.pixels.length === TOTAL_PIXELS
      ? (initialPayload.pixels as number[])
      : new Array<number>(TOTAL_PIXELS).fill(0),
  );
  const [paletteSnapshot, setPaletteSnapshot] = useState<string[]>(
    Array.isArray(initialPayload.paletteSnapshot) && initialPayload.paletteSnapshot.length > 0
      ? (initialPayload.paletteSnapshot as string[])
      : descriptorPalette,
  );
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Step 3 / 4 / 5 form state.
  const [contributionName, setContributionName] = useState<string>(
    typeof initialPayload.contributionName === 'string' ? initialPayload.contributionName : '',
  );
  const [contributionSpec, setContributionSpec] = useState<string>(
    typeof initialPayload.contributionSpec === 'string' ? initialPayload.contributionSpec : '',
  );
  const [artistWords, setArtistWords] = useState<string>('');
  const [signature, setSignature] = useState<`0x${string}` | null>(
    typeof initialPayload.signature === 'string' && initialPayload.signature.startsWith('0x')
      ? (initialPayload.signature as `0x${string}`)
      : null,
  );
  const [signerVerified, setSignerVerified] = useState<boolean>(Boolean(signature));
  const [signingError, setSigningError] = useState<string | null>(null);

  const { address: connectedAddress } = useAccount();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // -- step 2 helpers ----------------------------------------------------

  const mismatchedIndices = useMemo<number[]>(() => {
    const out: number[] = [];
    for (let i = 0; i < pixels.length; i++) {
      if (pixels[i] === -1) out.push(i);
    }
    return out;
  }, [pixels]);

  // -- handlers ----------------------------------------------------------

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const { pixels: decoded, paletteUsed, dataUrl } = await decodePngToPixels(file);
        setPixels(decoded);
        setPaletteSnapshot(descriptorPalette);
        // dataUrl preserved for the eventual thumbnail.
        thumbnailRef.current = dataUrl;
        // Capture the raw uploaded palette for the mismatch UI.
        mismatchHexRef.current = paletteUsed;
        // If everything resolved cleanly, advance straight to step 2 so the
        // user can confirm there are no mismatches.
        setStep(2);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load image';
        setError(msg);
      }
    },
    [descriptorPalette],
  );

  const handleSnapAll = useCallback(() => {
    setPixels((prev) => {
      const next = [...prev];
      const rgbaFromIndex = mismatchHexRef.current;
      for (let i = 0; i < next.length; i++) {
        if (next[i] !== -1) continue;
        // The original RGBA value isn't kept past decode — we already lost
        // it on the way in. Snap by re-using the closest descriptor palette
        // colour from each unique mismatch hex. Iterate mismatchHexRef to
        // build a hex→snappedIndex map once, then look up.
        const fallback = rgbaFromIndex[0] ?? '#000000';
        try {
          next[i] = nearestPaletteIndex(fallback, descriptorPalette);
        } catch {
          next[i] = 1;
        }
      }
      return next;
    });
  }, [descriptorPalette]);

  // We need a per-pixel snap, not bulk. Re-run decode but snap each unique
  // mismatch hex to its nearest palette index.
  const handleSnapAllPerPixel = useCallback(
    async () => {
      // Re-derive the mismatch hex→index map by parsing the original data url.
      const dataUrl = thumbnailRef.current;
      if (!dataUrl) return;
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () => reject(new Error('Failed to re-decode image'));
          i.src = dataUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0);
        const rgba = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;

        const hexCache = new Map<string, number>();
        const next = new Array<number>(TOTAL_PIXELS).fill(0);

        for (let i = 0; i < TOTAL_PIXELS; i++) {
          const r = rgba[i * 4];
          const g = rgba[i * 4 + 1];
          const b = rgba[i * 4 + 2];
          const a = rgba[i * 4 + 3];
          if (a === 0) {
            next[i] = 0;
            continue;
          }
          const hex = `#${[r, g, b]
            .map((v) => v.toString(16).padStart(2, '0'))
            .join('')}`;
          let idx = hexCache.get(hex);
          if (idx === undefined) {
            try {
              idx = nearestPaletteIndex(hex, descriptorPalette);
            } catch {
              idx = 1;
            }
            hexCache.set(hex, idx);
          }
          next[i] = idx;
        }
        setPixels(next);
        setError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to snap colours';
        setError(msg);
      }
    },
    [descriptorPalette],
  );

  const handleSign = useCallback(async () => {
    setSigningError(null);
    if (!connectedAddress) {
      setSigningError('Connect a wallet to sign the agreement.');
      return;
    }
    const text = generateAgreementText({
      signerName: connectedAddress,
      signerAddress: connectedAddress,
      contributionName: contributionName.trim(),
      contributionSpec: contributionSpec.trim(),
    });
    try {
      const sig = await signMessageAsync({ message: text });
      const recovered = await recoverMessageAddress({ message: text, signature: sig });
      if (recovered.toLowerCase() !== connectedAddress.toLowerCase()) {
        throw new Error('Recovered signer does not match connected wallet');
      }
      setSignature(sig as `0x${string}`);
      setSignerVerified(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to sign agreement';
      setSigningError(msg);
      setSignerVerified(false);
    }
  }, [connectedAddress, contributionName, contributionSpec, signMessageAsync]);

  // Refs for state we don't want to re-render on (decoded data url + last
  // uploaded palette set). Kept outside useState to avoid unnecessary churn.
  const thumbnailRef = useRef<string>(
    typeof initialPayload.thumbnailDataUrl === 'string' ? initialPayload.thumbnailDataUrl : '',
  );
  const mismatchHexRef = useRef<string[]>([]);
  // Suppress lint warning about handleSnapAll (kept as a deliberate alt path).
  void handleSnapAll;

  // -- Step 5: build payload --------------------------------------------

  const handleSave = useCallback(() => {
    if (isReadOnly) {
      setOpen(false);
      return;
    }
    if (mismatchedIndices.length > 0) {
      setError('Snap all out-of-palette pixels before saving.');
      setStep(2);
      return;
    }
    if (!connectedAddress) {
      setError('Connect a wallet before saving.');
      setStep(4);
      return;
    }
    if (!signature || !signerVerified) {
      setError('Sign the CC0 agreement before saving.');
      setStep(4);
      return;
    }

    let encoded: ReturnType<typeof compressAndEncodeTrait>;
    try {
      encoded = compressAndEncodeTrait(pixels, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to encode trait');
      return;
    }

    const agreementText = generateAgreementText({
      signerName: connectedAddress,
      signerAddress: connectedAddress,
      contributionName: contributionName.trim(),
      contributionSpec: contributionSpec.trim(),
    });
    const generatedMarkdown = generateAgreementMarkdown({
      signerName: connectedAddress,
      signerAddress: connectedAddress,
      contributionName: contributionName.trim(),
      contributionSpec: contributionSpec.trim(),
      signature,
    });

    const thumbnailDataUrl =
      thumbnailRef.current || renderPreview(pixels, descriptorPalette);

    const payload: ArtworkTraitPayload = {
      traitType,
      paletteIndex: 0,
      pixels,
      paletteSnapshot,
      contributionName: contributionName.trim(),
      contributionSpec: contributionSpec.trim(),
      signer: connectedAddress,
      signature,
      agreementText,
      thumbnailDataUrl,
      encodedBytes: encoded.compressedBytes,
      decompressedLength: encoded.decompressedLength.toString(),
      itemCount: encoded.itemCount,
      generatedMarkdown,
    };

    onChange(JSON.stringify(payload));
    if (onAppendDescription) {
      // Append the artist words plus the signed markdown block. The parent
      // form is responsible for de-duping if the user re-opens the wizard.
      const block = artistWords.trim()
        ? `\n\n${artistWords.trim()}\n\n${generatedMarkdown}`
        : `\n\n${generatedMarkdown}`;
      onAppendDescription(block);
    }
    setOpen(false);
    setError(null);
  }, [
    artistWords,
    connectedAddress,
    contributionName,
    contributionSpec,
    descriptorPalette,
    isReadOnly,
    mismatchedIndices.length,
    onAppendDescription,
    onChange,
    paletteSnapshot,
    pixels,
    signature,
    signerVerified,
    traitType,
  ]);

  // Pre-render the in-modal preview from the working pixel array.
  const previewSrc = useMemo(() => {
    if (thumbnailRef.current && pixels.every((p) => p === 0)) return thumbnailRef.current;
    return renderPreview(
      pixels.map((p) => (p === -1 ? 0 : p)),
      descriptorPalette,
    );
  }, [pixels, descriptorPalette]);

  // -- Save-button disabled logic --------------------------------------

  const canAdvanceFromStep = useCallback(
    (s: WizardStep): boolean => {
      if (s === 1) return pixels.some((p) => p !== 0);
      if (s === 2) return mismatchedIndices.length === 0;
      if (s === 3) return contributionName.trim().length > 0;
      if (s === 4) return Boolean(signature && signerVerified);
      return true;
    },
    [pixels, mismatchedIndices.length, contributionName, signature, signerVerified],
  );

  useEffect(() => {
    // When the wizard opens, jump to the earliest unfinished step. Drafts
    // restored from a payload should land on step 5 by default.
    if (!open) return;
    if (initialPayload.signature && initialPayload.encodedBytes && !isReadOnly) {
      setStep(5);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hasPayload = Boolean(initialPayload.encodedBytes && initialPayload.encodedBytes !== '0x');

  if (!open) {
    return (
      <button
        type="button"
        className={styles.openButton}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <span className={styles.openButtonTitle}>
          {hasPayload
            ? `Edit ${traitType} artwork`
            : `Open ${traitType} artwork wizard`}
        </span>
        <span className={styles.openButtonSubtitle}>
          {hasPayload
            ? isReadOnly
              ? 'Loaded from existing proposal (not editable)'
              : `Signed contribution by ${initialPayload.signer ? truncateHex(initialPayload.signer) : 'unknown'}`
            : 'Upload → palette check → metadata → CC0 signature → confirm'}
        </span>
      </button>
    );
  }

  return (
    <div className={styles.wizard}>
      <div className={styles.steps}>
        {([1, 2, 3, 4, 5] as const).map((s, i) => (
          <span key={s}>
            <span
              className={[
                styles.step,
                s === step
                  ? styles.stepActive
                  : s < step
                    ? styles.stepDone
                    : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {s}. {['Source', 'Palette', 'Metadata', 'Sign', 'Confirm'][i]}
            </span>
            {i < 4 && <span className={styles.stepSeparator}>›</span>}
          </span>
        ))}
      </div>

      <div className={styles.body}>
        {isReadOnly && (
          <div className={styles.readOnlyBanner}>
            This action was reverse-engineered from an existing proposal. The
            original PNG, palette snapshot, and signed agreement are not
            recoverable from on-chain bytes. The action is preserved as-is —
            close the wizard to keep the encoded calldata intact.
          </div>
        )}

        {step === 1 && (
          <>
            <h4 className={styles.heading}>Choose source artwork</h4>
            <p className={styles.hint}>
              Upload a 32×32 PNG. Index 0 (fully transparent pixels) becomes
              the on-chain transparent slot. Anything else must resolve to a
              colour in the descriptor palette (next step).
            </p>
            <label
              className={[
                styles.dropZone,
                dragActive ? styles.dropZoneActive : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer?.files?.[0];
                if (file) handleFile(file);
              }}
            >
              <strong>Drop a 32×32 PNG here</strong>
              <span className={styles.hint}>or click to choose a file</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png"
                className={styles.fileInput}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </label>
            <button
              type="button"
              className={styles.button}
              onClick={() => setError('Studio integration coming next')}
              disabled
              title="Studio integration coming next"
            >
              Pick from your Studio traits (coming soon)
            </button>
            {error && <div className={styles.errorText}>{error}</div>}
          </>
        )}

        {step === 2 && (
          <>
            <h4 className={styles.heading}>Palette validation</h4>
            <p className={styles.hint}>
              Every visible pixel must map to a colour already in the Nouns
              descriptor palette (Index 0 = transparent).
            </p>
            <div className={styles.previewRow}>
              <img src={previewSrc} alt="trait preview" className={styles.previewBox} />
              <div className={styles.previewMeta}>
                <span>Mismatched pixels: {mismatchedIndices.length}</span>
                {mismatchedIndices.length > 0 && (
                  <span className={styles.hint}>
                    Unique source colours seen: {mismatchHexRef.current.length}
                  </span>
                )}
              </div>
            </div>
            {mismatchedIndices.length > 0 ? (
              <>
                <div className={styles.mismatchList}>
                  {mismatchHexRef.current.slice(0, 32).map((hex) => (
                    <div key={hex}>
                      <span
                        className={styles.swatch}
                        style={{ background: hex }}
                      />
                      {hex} (not in palette)
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  onClick={handleSnapAllPerPixel}
                >
                  Snap each to nearest palette colour
                </button>
              </>
            ) : (
              <div className={styles.successText}>
                All pixels resolve to descriptor palette colours.
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h4 className={styles.heading}>Contribution metadata</h4>
            <div className={styles.formGroup}>
              <label className={styles.label}>Contribution name *</label>
              <input
                className={styles.input}
                type="text"
                value={contributionName}
                onChange={(e) => setContributionName(e.target.value)}
                placeholder="e.g. Noggles Mk II"
                disabled={disabled}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Specification URL (optional)</label>
              <input
                className={styles.input}
                type="text"
                value={contributionSpec}
                onChange={(e) => setContributionSpec(e.target.value)}
                placeholder="https:// or ipfs:// link"
                disabled={disabled}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Words from the artist (optional)</label>
              <textarea
                className={styles.textarea}
                value={artistWords}
                onChange={(e) => setArtistWords(e.target.value)}
                placeholder="What's the story behind this trait?"
                disabled={disabled}
                rows={4}
              />
              <span className={styles.hint}>
                Appended to the proposal description above the signed CC0 block.
              </span>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h4 className={styles.heading}>Sign CC0 agreement</h4>
            <p className={styles.hint}>
              Signed via EIP-191 personal_sign. The signature commits you to
              the exact text shown below. We verify the recovered signer
              matches your connected wallet.
            </p>
            <div className={styles.formGroup}>
              <label className={styles.label}>Signer</label>
              <div className={styles.signatureRow}>
                {connectedAddress ? truncateHex(connectedAddress, 8, 6) : 'Wallet not connected'}
              </div>
            </div>
            <pre className={styles.codeBlock}>
              {connectedAddress
                ? generateAgreementText({
                    signerName: connectedAddress,
                    signerAddress: connectedAddress,
                    contributionName: contributionName.trim(),
                    contributionSpec: contributionSpec.trim(),
                  })
                : 'Connect a wallet first.'}
            </pre>
            {signature && signerVerified ? (
              <>
                <div className={styles.successText}>Agreement signed and verified.</div>
                <div className={styles.signatureRow}>{truncateHex(signature, 12, 10)}</div>
                <button
                  type="button"
                  className={styles.buttonGhost}
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      void navigator.clipboard.writeText(signature);
                    }
                  }}
                >
                  Copy signature
                </button>
              </>
            ) : (
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={handleSign}
                disabled={!connectedAddress || isSigning || disabled}
              >
                {isSigning ? 'Signing…' : 'Sign agreement'}
              </button>
            )}
            {signingError && <div className={styles.errorText}>{signingError}</div>}
          </>
        )}

        {step === 5 && (
          <>
            <h4 className={styles.heading}>Confirm and save</h4>
            <div className={styles.previewRow}>
              <img
                src={previewSrc}
                alt="final trait preview"
                className={styles.previewBox}
              />
              <dl className={styles.summaryGrid}>
                <dt>Trait type</dt>
                <dd>{traitType}</dd>
                <dt>Palette index</dt>
                <dd>0</dd>
                <dt>Contribution</dt>
                <dd>{contributionName || '—'}</dd>
                <dt>Spec</dt>
                <dd>{contributionSpec || '—'}</dd>
                <dt>Signer</dt>
                <dd>{connectedAddress ? truncateHex(connectedAddress) : '—'}</dd>
                <dt>Signature</dt>
                <dd>{signature ? truncateHex(signature) : '—'}</dd>
              </dl>
            </div>
            {connectedAddress && signature ? (
              <pre className={styles.codeBlock}>
                {generateAgreementMarkdown({
                  signerName: connectedAddress,
                  signerAddress: connectedAddress,
                  contributionName: contributionName.trim(),
                  contributionSpec: contributionSpec.trim(),
                  signature,
                })}
              </pre>
            ) : (
              <div className={styles.hint}>
                Complete steps 1–4 before saving.
              </div>
            )}
            {error && <div className={styles.errorText}>{error}</div>}
          </>
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.buttonGhost}
          onClick={() => setOpen(false)}
        >
          Close wizard
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 1 && (
            <button
              type="button"
              className={styles.button}
              onClick={() => setStep((s) => Math.max(1, (s - 1) as WizardStep) as WizardStep)}
            >
              Back
            </button>
          )}
          {step < 5 && (
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => {
                if (!canAdvanceFromStep(step)) return;
                setStep((s) => Math.min(5, (s + 1) as WizardStep) as WizardStep);
              }}
              disabled={!canAdvanceFromStep(step) || disabled}
            >
              Next
            </button>
          )}
          {step === 5 && (
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={handleSave}
              disabled={disabled || isReadOnly}
            >
              {isReadOnly ? 'Read-only' : 'Save action'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
