/**
 * OpenSeaListingEditor
 * Custom editor for the `opensea-listing` template.
 *
 * Flow:
 *  1. User pastes an OpenSea listing URL.
 *  2. We parse the contract address + token ID out of it.
 *  3. /api/opensea/listing fetches the cheapest active listing and the
 *     ready-to-submit Seaport calldata + ETH value.
 *  4. Editor renders a preview card (image, name, seller, price,
 *     expiration). Warns if the listing expires before a proposal can
 *     realistically pass (~7 days).
 *  5. Calldata + ETH value + Seaport address are written to fieldValues
 *     so the generator emits a single proposal action without any
 *     further parsing.
 */

'use client';

import { useEffect, useMemo } from 'react';
import type { TemplateFieldValues } from '../../utils/actionTemplates';
import {
  useOpenSeaListing,
  parseOpenSeaUrl,
} from '../../hooks/useOpenSeaListing';
import editorStyles from './ActionTemplateEditor.module.css';
import styles from './OpenSeaListingEditor.module.css';

interface OpenSeaListingEditorProps {
  fieldValues: TemplateFieldValues;
  onUpdateField: (field: string, value: string) => void;
  disabled?: boolean;
}

// Heuristic: Nouns proposals take ~3 days voting + 2 days queue minimum
// (plus optional objection period). Anything less than 7 days from now is
// risky.
const SAFE_EXPIRATION_MARGIN_SECONDS = 7 * 24 * 60 * 60;

export function OpenSeaListingEditor({
  fieldValues,
  onUpdateField,
  disabled = false,
}: OpenSeaListingEditorProps) {
  const url = fieldValues.openseaUrl || '';
  const parsed = parseOpenSeaUrl(url);

  const {
    data: listing,
    isLoading,
    isError,
    error,
  } = useOpenSeaListing(parsed?.contract, parsed?.tokenId);

  // Once the listing data lands, push the encoded transaction into the
  // template's fields so the generator can emit it unchanged.
  useEffect(() => {
    if (!listing) return;
    onUpdateField('to', listing.to);
    onUpdateField('value', listing.value);
    onUpdateField('calldata', listing.calldata);
    onUpdateField('orderHash', listing.listing.orderHash);
  }, [listing, onUpdateField]);

  // `Date.now()` is intentionally impure here — we want a fresh comparison
  // against the listing's expiration each time a new listing lands.
  // Mirrors the same pattern used elsewhere in Camp (e.g. ProposalDetailView's
  // time-remaining display).
  const expiresSoon = useMemo(() => {
    if (!listing) return false;
    // eslint-disable-next-line react-hooks/purity
    const now = Math.floor(Date.now() / 1000);
    return listing.listing.expirationTimestamp - now < SAFE_EXPIRATION_MARGIN_SECONDS;
  }, [listing]);

  return (
    <div className={editorStyles.templateForm}>
      <div className={editorStyles.inputGroup}>
        <label className={editorStyles.label}>
          OpenSea Listing URL <span className={editorStyles.required}>*</span>
        </label>
        <input
          type="text"
          className={editorStyles.input}
          value={url}
          onChange={(e) => onUpdateField('openseaUrl', e.target.value)}
          placeholder="https://opensea.io/assets/ethereum/0x.../12345"
          disabled={disabled}
        />
        <div className={editorStyles.helpText}>
          Paste the URL of the NFT&apos;s OpenSea page. The editor finds the
          cheapest active ETH listing and builds the calldata automatically.
        </div>
      </div>

      {url && !parsed && (
        <div className={editorStyles.error}>
          Couldn&apos;t parse this URL. Use an OpenSea asset URL like{' '}
          <code>https://opensea.io/assets/ethereum/0xCONTRACT/TOKENID</code>.
        </div>
      )}

      {parsed && isLoading && (
        <div className={styles.statusLine}>Looking up listing on OpenSea…</div>
      )}

      {parsed && isError && (
        <div className={editorStyles.error}>
          {error instanceof Error ? error.message : 'Listing lookup failed.'}
        </div>
      )}

      {listing && (
        <div className={styles.listingCard}>
          {listing.listing.imageUrl && (
            <img
              src={listing.listing.imageUrl}
              alt=""
              className={styles.listingImage}
            />
          )}
          <div className={styles.listingBody}>
            <div className={styles.listingName}>
              {listing.listing.name ||
                `${parsed?.contract.slice(0, 8)}…/${parsed?.tokenId}`}
            </div>
            {listing.listing.collectionSlug && (
              <div className={styles.listingCollection}>
                {listing.listing.collectionSlug}
              </div>
            )}
            <div className={styles.listingPrice}>
              <strong>{listing.listing.priceEth} ETH</strong>
            </div>
            <div className={styles.listingMeta}>
              Seller {shortAddress(listing.listing.seller)}
              {' · '}
              expires{' '}
              <span
                className={expiresSoon ? styles.expirationWarning : undefined}
              >
                {formatTimeFromNow(listing.listing.expirationTimestamp)}
              </span>
              {listing.listing.isReserveListing && (
                <>
                  {' · '}
                  <span className={styles.reserveBadge}>
                    reserved for treasury
                  </span>
                </>
              )}
            </div>
            {expiresSoon && !listing.listing.isReserveListing && (
              <div className={styles.expirationCallout}>
                ⚠ This listing may expire before a proposal can pass
                (typically takes 5–7 days). Ask the seller to extend, or
                request a reserve listing addressed to the treasury.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function shortAddress(addr: string): string {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTimeFromNow(ts: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = ts - now;
  if (diff <= 0) return 'expired';
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days >= 1) return `in ${days} day${days !== 1 ? 's' : ''}`;
  if (hours >= 1) return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  const minutes = Math.floor(diff / 60);
  return `in ${minutes} min`;
}
