"use client";

/**
 * Square thumbnail grid for the AvatarPickerModal.
 * Receives the NFT list + selected URI + selection callback;
 * pagination / search live in the parent.
 */

import type { MyNft } from "@/app/lib/ens/hooks";
import styles from "./NftGrid.module.css";

interface NftGridProps {
  nfts: MyNft[];
  selectedUri?: string | null;
  onSelect: (uri: string, nft: MyNft) => void;
}

export function NftGrid({ nfts, selectedUri, onSelect }: NftGridProps) {
  if (nfts.length === 0) {
    return <div className={styles.empty}>No NFTs match the search.</div>;
  }

  return (
    <div className={styles.grid}>
      {nfts.map((nft) => {
        const key = nft.ensAvatarUri;
        const selected = selectedUri === key;
        return (
          <button
            key={key}
            type="button"
            className={`${styles.tile} ${selected ? styles.selected : ""}`}
            onClick={() => onSelect(key, nft)}
            title={nft.name ?? nft.collectionName ?? key}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={nft.image} alt="" className={styles.image} />
            <div className={styles.label}>
              <span className={styles.collection}>
                {nft.collectionName ?? "Collection"}
              </span>
              <span className={styles.tokenId}>#{nft.tokenId}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
