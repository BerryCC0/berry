"use client";

/**
 * NameDetail — view and edit records for a single ENS name.
 *
 * Reads via useEnsRecords (Universal Resolver batched) + useEnsDomain
 * (our indexer, for ownership + wrap state).
 *
 * Writes via useSetEnsRecords (multicall through the name's resolver).
 * Dirty state is tracked per-record and composed into a single multicall
 * save on submit.
 *
 * Subnames + Fuses sections render as placeholder shells in this phase;
 * P5 and P6 fill them in.
 */

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import {
  useEnsRecords,
  useEnsDomain,
  useEnsSubnames,
  useSetEnsRecords,
  useSetPrimaryName,
  useEnsInvalidate,
  DEFAULT_TEXT_KEYS,
  DEFAULT_COIN_TYPES,
} from "@/app/lib/ens/hooks";
import {
  RecordSection,
  RecordRow,
  ExpiryPill,
  ChainBadge,
  TransferModal,
  SubnameRow,
  CreateSubnameModal,
  FuseChecklist,
  AvatarPickerModal,
} from "../components";
import styles from "./NameDetail.module.css";

interface NameDetailProps {
  name: string;
  /** Called with another name to navigate (used by subname rows). */
  onNavigate?: (name: string) => void;
  onBack: () => void;
}

interface DirtyState {
  texts: Record<string, string>;
  coins: Record<string, string>;
}

function truncateHex(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 2) return value;
  return `${value.slice(0, head + 2)}…${value.slice(-tail)}`;
}

export function NameDetail({ name, onBack, onNavigate }: NameDetailProps) {
  const { address } = useAccount();
  const records = useEnsRecords(name);
  const indexed = useEnsDomain(name);
  const subnames = useEnsSubnames(name);
  const setRecords = useSetEnsRecords();
  const setPrimary = useSetPrimaryName();
  const invalidate = useEnsInvalidate();

  // Dirty state is reset by remounting via `key={name}` at the call site.
  const [dirty, setDirty] = useState<DirtyState>({ texts: {}, coins: {} });
  const [transferOpen, setTransferOpen] = useState(false);
  const [createSubnameOpen, setCreateSubnameOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [savedTick, setSavedTick] = useState(0);

  const dirtyTextEntries = Object.entries(dirty.texts);
  const dirtyCoinEntries = Object.entries(dirty.coins);
  const dirtyCount = dirtyTextEntries.length + dirtyCoinEntries.length;

  const setTextDraft = (key: string, value: string) => {
    setDirty((d) => ({ ...d, texts: { ...d.texts, [key]: value } }));
  };

  const setCoinDraft = (coin: string, value: string) => {
    setDirty((d) => ({ ...d, coins: { ...d.coins, [coin]: value } }));
  };

  const handleSave = async () => {
    if (dirtyCount === 0) return;
    await setRecords.setMany({
      name,
      texts: dirtyTextEntries.map(([key, value]) => ({ key, value })),
      coins: dirtyCoinEntries.map(([coin, value]) => ({ coin, value })),
    });
    setDirty({ texts: {}, coins: {} });
    invalidate.name(name);
    setSavedTick((t) => t + 1);
    window.setTimeout(() => setSavedTick(0), 1500);
  };

  const handleSetPrimary = async () => {
    await setPrimary.setPrimary(name);
    if (address) invalidate.address(address);
  };

  const existingTexts = useMemo(() => {
    const map = new Map<string, string>();
    if (records.data?.texts) {
      for (const t of records.data.texts) map.set(t.key, t.value ?? "");
    }
    return map;
  }, [records.data]);

  const existingCoins = useMemo(() => {
    const map = new Map<string, string>();
    if (records.data?.coins) {
      for (const c of records.data.coins) map.set(String(c.id), c.value);
    }
    return map;
  }, [records.data]);

  return (
    <div className={styles.container}>
      <button type="button" className={styles.back} onClick={onBack}>
        ← Back
      </button>

      <header className={styles.header}>
        <h2 className={styles.name}>{name}</h2>
        <div className={styles.headerMeta}>
          {indexed.data?.registrant && (
            <span className={styles.muted}>
              owner {truncateHex(indexed.data.registrant)}
            </span>
          )}
          {indexed.data?.expiry && <ExpiryPill expiry={indexed.data.expiry} />}
        </div>
      </header>

      {records.isLoading && <div className={styles.loading}>Loading records…</div>}

      {records.data && (
        <>
          <RecordSection title="Profile">
            {DEFAULT_TEXT_KEYS.map((key) => {
              const draft = dirty.texts[key];
              const current = existingTexts.get(key) ?? "";
              // Avatar uses the dedicated picker modal — no inline editor.
              if (key === "avatar") {
                return (
                  <RecordRow
                    key={key}
                    label={key}
                    value={current || "—"}
                    mono={current.startsWith("eip155:")}
                    editable
                    customEditor={() => setAvatarOpen(true)}
                  />
                );
              }
              return (
                <RecordRow
                  key={key}
                  label={key}
                  value={draft ?? current}
                  editable
                  onChange={(v) => setTextDraft(key, v)}
                  isDirty={draft !== undefined && draft !== current}
                />
              );
            })}
          </RecordSection>

          <RecordSection title="Addresses">
            {DEFAULT_COIN_TYPES.map((coin) => {
              const draft = dirty.coins[String(coin)];
              const current = existingCoins.get(String(coin)) ?? "";
              return (
                <RecordRow
                  key={coin}
                  label=""
                  leading={<ChainBadge coinType={coin} />}
                  value={draft ?? current}
                  mono
                  editable
                  onChange={(v) => setCoinDraft(String(coin), v)}
                  isDirty={draft !== undefined && draft !== current}
                />
              );
            })}
          </RecordSection>

          <RecordSection
            title="Subnames"
            action={
              <button
                type="button"
                className={styles.miniAction}
                onClick={() => setCreateSubnameOpen(true)}
              >
                + Create
              </button>
            }
            emptyLabel="No subnames yet"
          >
            {subnames.data && subnames.data.length > 0
              ? subnames.data.map((s) => (
                  <SubnameRow
                    key={s.node}
                    subname={s}
                    parentName={name}
                    parentIsWrapped={!!indexed.data?.isWrapped}
                    onOpen={(n) => onNavigate?.(n)}
                  />
                ))
              : null}
          </RecordSection>

          {indexed.data?.isWrapped && (
            <RecordSection title="Fuses">
              <FuseChecklist name={name} fuses={indexed.data.fuses ?? 0} />
            </RecordSection>
          )}
        </>
      )}

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.action}
          onClick={handleSetPrimary}
          disabled={setPrimary.isPending}
        >
          {setPrimary.isPending ? "Confirm…" : "Set as primary"}
        </button>
        <button
          type="button"
          className={styles.action}
          onClick={() => setTransferOpen(true)}
        >
          Transfer
        </button>
        <button
          type="button"
          className={`${styles.action} ${styles.primary}`}
          onClick={handleSave}
          disabled={dirtyCount === 0 || setRecords.isPending}
        >
          {setRecords.isPending
            ? "Saving…"
            : savedTick > 0
              ? "✓ Saved"
              : dirtyCount > 0
                ? `Save ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}`
                : "Save"}
        </button>
      </footer>

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        name={name}
        domain={indexed.data ?? null}
        onSuccess={onBack}
      />

      <CreateSubnameModal
        open={createSubnameOpen}
        onClose={() => setCreateSubnameOpen(false)}
        parentName={name}
        parentIsWrapped={!!indexed.data?.isWrapped}
        parentResolver={indexed.data?.resolver}
      />

      <AvatarPickerModal
        open={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        name={name}
        currentValue={existingTexts.get("avatar") ?? ""}
      />

      {(setRecords.error || setPrimary.error) && (
        <div className={styles.error}>
          {setRecords.error?.message ?? setPrimary.error?.message}
        </div>
      )}
    </div>
  );
}
