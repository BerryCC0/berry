"use client";

/**
 * IdentityShell — shared wrapper used by both WalletPanel and Names.
 *
 * Always renders an IdentityHeader at the top (address + ENS + chain +
 * SurfaceToggle). Children fill the body below. Consumers don't choose
 * the header — it's the same on both surfaces so the swap feels like
 * a face flip rather than a window replacement.
 *
 * If a surface ever needs to customize the header, we add an opt-in
 * prop here. Today no surface does.
 */

import type { ReactNode } from "react";
import { IdentityHeader } from "./components";
import styles from "./IdentityShell.module.css";

export type IdentitySurface = "wallet" | "names";

interface IdentityShellProps {
  windowId: string;
  surface: IdentitySurface;
  children: ReactNode;
}

export function IdentityShell({ windowId, surface, children }: IdentityShellProps) {
  return (
    <div className={styles.shell}>
      <IdentityHeader windowId={windowId} surface={surface} />
      <div className={styles.body}>{children}</div>
    </div>
  );
}
