"use client";

/**
 * TransferModal — confirm transfer of an ENS name to a new address.
 *
 * Auto-picks the right contract (registry/nameWrapper/registrar) based on
 * the name's current state. Supports single-name transfer; bulk transfers
 * (P2 / future) can iterate this modal or use a sequential dispatcher.
 */

import { useState } from "react";
import { isAddress } from "viem";
import { Dialog } from "@/OS/Primitives/Dialog";
import { useTransferEnsName, useEnsInvalidate } from "@/app/lib/ens/hooks";
import type { Address } from "viem";
import type { EnsDomain } from "@/app/lib/ens/hooks";
import styles from "./TransferModal.module.css";

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  /** The name being transferred. */
  name: string;
  /** The indexed domain row — used to pick contract automatically. */
  domain?: EnsDomain | null;
  /** Called on successful tx. */
  onSuccess?: () => void;
}

function pickContract(domain: EnsDomain | null | undefined): "registry" | "nameWrapper" | "registrar" {
  if (!domain) return "registry";
  if (domain.isWrapped) return "nameWrapper";
  if (domain.registrant) return "registrar";
  return "registry";
}

export function TransferModal({ open, onClose, name, domain, onSuccess }: TransferModalProps) {
  const [destination, setDestination] = useState("");
  const transfer = useTransferEnsName();
  const invalidate = useEnsInvalidate();

  const contract = pickContract(domain);
  const trimmed = destination.trim();
  const valid = isAddress(trimmed);
  const showError = destination.length > 0 && !valid;

  const handleTransfer = async () => {
    if (!valid) return;
    await transfer.transfer({
      name,
      newOwnerAddress: trimmed as Address,
      contract,
    });
    invalidate.name(name);
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Transfer ${name}`}
      width={420}
      actions={[
        { label: "Cancel", onClick: onClose, closeOnClick: true },
        {
          label: transfer.isPending ? "Confirm in wallet…" : "Transfer",
          variant: "primary",
          onClick: handleTransfer,
        },
      ]}
    >
      <div className={styles.body}>
        <p className={styles.warning}>
          Transferring sends ownership to another wallet. This is irreversible from your side.
        </p>
        <label className={styles.label}>
          Destination address
          <input
            type="text"
            className={styles.input}
            placeholder="0x…"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </label>
        {showError && (
          <div className={styles.error}>Not a valid Ethereum address.</div>
        )}
        <div className={styles.meta}>
          Transferring via <strong>{contract}</strong> contract
        </div>
        {transfer.error && <div className={styles.error}>Error: {transfer.error.message}</div>}
      </div>
    </Dialog>
  );
}
