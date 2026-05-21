"use client";

/**
 * Names — full ENS management surface, sibling to WalletPanel.
 *
 * Houses four views switched via internal tab state:
 *   - my-names: list and manage ENS names owned by the connected wallet
 *   - lookup:   resolve any ENS name and show its records
 *   - dns:      DNS → ENS import wizard (gasless + onchain paths)
 *   - register: .eth registration (2-step commit/reveal)
 *
 * Wallet surface lives in /system/WalletPanel. The two share IdentityShell
 * and swap via SurfaceToggle in the shell header.
 */

import { useState } from "react";
import { IdentityShell } from "@/OS/Apps/system/_identity";
import type { AppComponentProps } from "@/OS/types/app";
import { MyNames } from "./views/MyNames";
import { Lookup } from "./views/Lookup";
import { NameDetail } from "./views/NameDetail";
import { DnsImport } from "./views/DnsImport";
import { Register } from "./views/Register";
import { TabStrip, type Tab } from "./components";
import styles from "./Names.module.css";

type TabId = "my-names" | "lookup" | "dns" | "register";

const TABS: Tab<TabId>[] = [
  { id: "my-names", label: "My Names" },
  { id: "lookup", label: "Lookup" },
  { id: "dns", label: "DNS Import" },
  { id: "register", label: "Register" },
];

type NamesView = "my-names" | "lookup" | "dns" | "register" | "detail";

export interface NamesInitialState {
  view?: NamesView;
  /** When view === 'detail', which name to show. */
  selectedName?: string;
}

export function Names({ windowId, initialState }: AppComponentProps) {
  const initial = (initialState as NamesInitialState | undefined) ?? {};
  const [view, setView] = useState<NamesView>(initial.view ?? "my-names");
  const [selectedName, setSelectedName] = useState<string | undefined>(initial.selectedName);

  const openDetail = (name: string) => {
    setSelectedName(name);
    setView("detail");
  };

  const backToList = () => {
    setSelectedName(undefined);
    setView("my-names");
  };

  // Tab strip's active id mirrors the view, except "detail" shows as "my-names".
  const activeTab: TabId = view === "detail" ? "my-names" : (view as TabId);

  return (
    <IdentityShell windowId={windowId} surface="names">
      <TabStrip tabs={TABS} active={activeTab} onChange={(t) => setView(t)} />
      <div className={styles.viewport}>
        {view === "my-names" && (
          <MyNames onSelect={openDetail} onRegister={() => setView("register")} />
        )}
        {view === "lookup" && <Lookup onSelect={openDetail} />}
        {view === "detail" && selectedName && (
          <NameDetail
            key={selectedName}
            name={selectedName}
            onBack={backToList}
            onNavigate={openDetail}
          />
        )}
        {view === "dns" && <DnsImport />}
        {view === "register" && <Register />}
      </div>
    </IdentityShell>
  );
}
