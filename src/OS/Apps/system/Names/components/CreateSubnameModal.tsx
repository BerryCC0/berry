"use client";

/**
 * Modal for creating a new subname under a parent ENS name.
 *
 * Required inputs: label (the new local component, no dots).
 * Optional: owner (defaults to connected wallet), resolver (defaults
 * to parent's), expiry (NameWrapper only).
 *
 * Picks contract automatically — wrapped parent → NameWrapper, else
 * Registry. Wrapped subname creation lets us pass fuses (future).
 */

import { useState } from "react";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { Dialog } from "@/OS/Primitives/Dialog";
import { useCreateSubname, useEnsInvalidate } from "@/app/lib/ens/hooks";
import { ENS_ADDRESSES } from "@/app/lib/ens/contracts";
import type { Address } from "viem";
import styles from "./CreateSubnameModal.module.css";

interface CreateSubnameModalProps {
  open: boolean;
  onClose: () => void;
  parentName: string;
  parentIsWrapped: boolean;
  parentResolver?: string | null;
}

export function CreateSubnameModal({
  open,
  onClose,
  parentName,
  parentIsWrapped,
  parentResolver,
}: CreateSubnameModalProps) {
  const { address } = useAccount();
  const [label, setLabel] = useState("");
  const [ownerInput, setOwnerInput] = useState("");
  const [resolverInput, setResolverInput] = useState("");
  const creator = useCreateSubname();
  const invalidate = useEnsInvalidate();

  const labelValid = label.length > 0 && !label.includes(".");
  const effectiveOwner = ownerInput || address || "";
  const ownerValid = isAddress(effectiveOwner);
  const effectiveResolver = resolverInput || parentResolver || ENS_ADDRESSES.publicResolver;
  const resolverValid = isAddress(effectiveResolver);

  const canSubmit = labelValid && ownerValid && resolverValid && !creator.isPending;

  const fullName = `${label}.${parentName}`;

  const handleCreate = async () => {
    if (!canSubmit) return;
    await creator.create({
      name: fullName,
      owner: effectiveOwner as Address,
      contract: parentIsWrapped ? "nameWrapper" : "registry",
      resolverAddress: effectiveResolver as Address,
    });
    invalidate.name(parentName);
    setLabel("");
    setOwnerInput("");
    setResolverInput("");
    onClose();
  };

  const reset = () => {
    setLabel("");
    setOwnerInput("");
    setResolverInput("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={reset}
      title={`Create subname under ${parentName}`}
      width={440}
      actions={[
        { label: "Cancel", onClick: reset, closeOnClick: true },
        {
          label: creator.isPending ? "Confirm in wallet…" : "Create",
          variant: "primary",
          onClick: handleCreate,
        },
      ]}
    >
      <div className={styles.body}>
        <label className={styles.field}>
          <span>Label</span>
          <div className={styles.combo}>
            <input
              type="text"
              className={styles.input}
              placeholder="alice"
              value={label}
              onChange={(e) => setLabel(e.target.value.trim().toLowerCase())}
              autoFocus
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <span className={styles.suffix}>.{parentName}</span>
          </div>
          {label && !labelValid && (
            <span className={styles.error}>Label must not contain dots.</span>
          )}
        </label>

        <label className={styles.field}>
          <span>Owner</span>
          <input
            type="text"
            className={styles.input}
            placeholder={address ?? "0x…"}
            value={ownerInput}
            onChange={(e) => setOwnerInput(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          {ownerInput && !isAddress(ownerInput) && (
            <span className={styles.error}>Not a valid Ethereum address.</span>
          )}
        </label>

        <label className={styles.field}>
          <span>Resolver</span>
          <input
            type="text"
            className={styles.input}
            placeholder={parentResolver ?? ENS_ADDRESSES.publicResolver}
            value={resolverInput}
            onChange={(e) => setResolverInput(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </label>

        <div className={styles.meta}>
          Creating via <strong>{parentIsWrapped ? "NameWrapper" : "Registry"}</strong>
        </div>

        {creator.error && <div className={styles.error}>Error: {creator.error.message}</div>}
      </div>
    </Dialog>
  );
}
