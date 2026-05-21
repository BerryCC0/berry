"use client";

/**
 * AvatarPickerModal — two-mode picker for the ENS `avatar` text record.
 *
 * Mode 1: paste a URL (http, https, ipfs://, data:).
 * Mode 2: pick from connected wallet's NFTs (Alchemy NFT v3 via useMyNfts).
 *
 * On save, writes the avatar text record via useSetTextRecord.
 */

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Dialog } from "@/OS/Primitives/Dialog";
import {
  useMyNfts,
  useSetTextRecord,
  useEnsInvalidate,
  type MyNft,
} from "@/app/lib/ens/hooks";
import { SearchInput } from "./SearchInput";
import { NftGrid } from "./NftGrid";
import styles from "./AvatarPickerModal.module.css";

interface AvatarPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** The ENS name whose avatar record we're updating. */
  name: string;
  /** Current avatar value, used to preselect / populate the URL field. */
  currentValue?: string | null;
}

type Mode = "url" | "nft";

export function AvatarPickerModal({ open, onClose, name, currentValue }: AvatarPickerModalProps) {
  const { address } = useAccount();
  const [mode, setMode] = useState<Mode>("url");
  const [urlValue, setUrlValue] = useState(currentValue ?? "");
  const [selectedNft, setSelectedNft] = useState<{ uri: string; nft: MyNft } | null>(null);
  const [search, setSearch] = useState("");

  const nfts = useMyNfts(address);
  const setter = useSetTextRecord();
  const invalidate = useEnsInvalidate();

  const allNfts = useMemo(() => {
    if (!nfts.data) return [];
    return nfts.data.pages.flatMap((p) => p.nfts);
  }, [nfts.data]);

  const filteredNfts = useMemo(() => {
    if (!search.trim()) return allNfts;
    const q = search.toLowerCase();
    return allNfts.filter(
      (n) =>
        (n.collectionName ?? "").toLowerCase().includes(q) ||
        (n.name ?? "").toLowerCase().includes(q),
    );
  }, [allNfts, search]);

  const valueToSave = mode === "url" ? urlValue.trim() : selectedNft?.uri ?? "";
  const canSave = valueToSave.length > 0 && !setter.isPending;

  const handleSave = async () => {
    if (!canSave) return;
    await setter.setText({ name, key: "avatar", value: valueToSave });
    invalidate.name(name);
    onClose();
  };

  const reset = () => {
    setMode("url");
    setUrlValue(currentValue ?? "");
    setSelectedNft(null);
    setSearch("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={reset}
      title="Set avatar"
      width={520}
      actions={[
        { label: "Cancel", onClick: reset, closeOnClick: true },
        {
          label: setter.isPending ? "Confirm in wallet…" : "Set as avatar",
          variant: "primary",
          onClick: handleSave,
        },
      ]}
    >
      <div className={styles.body}>
        <div className={styles.modeSwitch}>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === "url" ? styles.active : ""}`}
            onClick={() => setMode("url")}
          >
            From URL
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === "nft" ? styles.active : ""}`}
            onClick={() => setMode("nft")}
            disabled={!address}
          >
            From your NFTs
          </button>
        </div>

        {mode === "url" && (
          <div className={styles.urlMode}>
            <input
              type="text"
              className={styles.urlInput}
              placeholder="https://example.com/image.png or ipfs://…"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <p className={styles.hint}>
              Paste any image URL. ENS supports HTTP(S), IPFS (ipfs://), and data: URIs.
            </p>
          </div>
        )}

        {mode === "nft" && (
          <div className={styles.nftMode}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search collections…"
              debounceMs={150}
            />

            {!address && (
              <div className={styles.empty}>Connect a wallet to see your NFTs.</div>
            )}

            {address && nfts.isLoading && (
              <div className={styles.empty}>Loading your NFTs…</div>
            )}

            {address && nfts.error && (
              <div className={styles.empty}>Failed to load NFTs: {nfts.error.message}</div>
            )}

            {address && !nfts.isLoading && (
              <>
                <NftGrid
                  nfts={filteredNfts}
                  selectedUri={selectedNft?.uri}
                  onSelect={(uri, nft) => setSelectedNft({ uri, nft })}
                />
                {nfts.hasNextPage && (
                  <button
                    type="button"
                    className={styles.loadMore}
                    onClick={() => nfts.fetchNextPage()}
                    disabled={nfts.isFetchingNextPage}
                  >
                    {nfts.isFetchingNextPage ? "Loading…" : "Load more"}
                  </button>
                )}
                {selectedNft && (
                  <div className={styles.preview}>
                    <span className={styles.previewLabel}>Selected:</span>
                    <span className={styles.previewValue}>
                      {selectedNft.nft.collectionName ?? "NFT"} #{selectedNft.nft.tokenId}
                    </span>
                    <code className={styles.uri}>{selectedNft.uri}</code>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {setter.error && <div className={styles.error}>Error: {setter.error.message}</div>}
      </div>
    </Dialog>
  );
}
