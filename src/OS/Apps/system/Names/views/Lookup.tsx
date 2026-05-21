"use client";

/**
 * Lookup — resolve any ENS name (read-only).
 *
 * Universal Resolver-backed. Works for .eth, DNS-imported names (via
 * ENSIP-10 wildcards), and subdomains.
 */

import { useState } from "react";
import { isValidEnsName } from "@/app/lib/ens/utils/namehash";
import {
  useEnsRecords,
  useEnsDomain,
  useEnsOwner,
  useEnsExpiry,
  DEFAULT_TEXT_KEYS,
} from "@/app/lib/ens/hooks";
import {
  SearchInput,
  EmptyState,
  RecordSection,
  RecordRow,
  ChainBadge,
  ExpiryPill,
} from "../components";
import styles from "./Lookup.module.css";

interface LookupProps {
  onSelect?: (name: string) => void;
}

function truncateHex(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 2) return value;
  return `${value.slice(0, head + 2)}…${value.slice(-tail)}`;
}

export function Lookup({ onSelect }: LookupProps) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState<string | undefined>(undefined);

  const records = useEnsRecords(submitted);
  const owner = useEnsOwner(submitted);
  const expiry = useEnsExpiry(submitted);
  const indexed = useEnsDomain(submitted);

  const handleSubmit = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (isValidEnsName(trimmed)) {
      setSubmitted(trimmed);
    } else {
      setSubmitted(undefined);
    }
  };

  const hint = input && !isValidEnsName(input.trim().toLowerCase())
    ? "Enter a full ENS name (e.g. vitalik.eth or nounsfoundation.org)"
    : undefined;

  return (
    <div className={styles.container}>
      <SearchInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        placeholder="vitalik.eth"
        hint={hint}
        hintTone="danger"
      />

      {!submitted && (
        <EmptyState
          icon="🔍"
          title="Look up any ENS name"
          description="Resolve .eth names, DNS-imported domains, and subnames. View their records, owners, and expiry."
        />
      )}

      {submitted && (records.isLoading || owner.isLoading || expiry.isLoading) && (
        <div className={styles.loading}>Resolving…</div>
      )}

      {submitted && records.data && (
        <div className={styles.results}>
          <div className={styles.headerRow}>
            <h2 className={styles.name}>{submitted}</h2>
            {expiry.data?.expiry && <ExpiryPill expiry={expiry.data.expiry.value} />}
          </div>

          <RecordSection title="Ownership">
            {owner.data?.owner && (
              <RecordRow
                label="owner"
                value={truncateHex(String(owner.data.owner))}
                mono
              />
            )}
            {indexed.data?.registrant && (
              <RecordRow
                label="registrant"
                value={truncateHex(indexed.data.registrant)}
                mono
              />
            )}
            {indexed.data?.wrappedOwner && (
              <RecordRow
                label="wrapped owner"
                value={truncateHex(indexed.data.wrappedOwner)}
                mono
              />
            )}
            {records.data.resolverAddress && (
              <RecordRow
                label="resolver"
                value={truncateHex(String(records.data.resolverAddress))}
                mono
              />
            )}
          </RecordSection>

          <RecordSection title="Addresses" emptyLabel="No addresses set">
            {records.data.coins.length === 0
              ? null
              : records.data.coins.map((c) => (
                  <RecordRow
                    key={c.id}
                    label=""
                    leading={<ChainBadge coinType={c.id} />}
                    value={c.value}
                    mono
                  />
                ))}
          </RecordSection>

          <RecordSection title="Profile" emptyLabel="No profile records">
            {records.data.texts.length === 0
              ? null
              : records.data.texts.map((t) => (
                  <RecordRow key={t.key} label={t.key} value={t.value} />
                ))}
          </RecordSection>

          {"contentHash" in records.data && records.data.contentHash && (
            <RecordSection title="Content Hash">
              <RecordRow
                label="contenthash"
                value={
                  typeof records.data.contentHash === "object"
                    ? `${records.data.contentHash.protocolType}://${records.data.contentHash.decoded}`
                    : String(records.data.contentHash)
                }
                mono
              />
            </RecordSection>
          )}

          {onSelect && (
            <div className={styles.footer}>
              <button
                type="button"
                className={styles.openButton}
                onClick={() => onSelect(submitted)}
              >
                Open in detail
              </button>
            </div>
          )}
        </div>
      )}

      {submitted && !records.isLoading && !records.data && (
        <EmptyState
          icon="∅"
          title="No records found"
          description={`${submitted} has no resolver configured or doesn't exist.`}
        />
      )}
    </div>
  );
}

// Surface the default text keys list so it's clear what Lookup queries.
export { DEFAULT_TEXT_KEYS };
