"use client";

/**
 * ToolbarContext — Dynamic Toolbar Portal System
 *
 * Allows app components to inject their own React content into the
 * OS-level title bar toolbar slots (leading, center, trailing).
 *
 * Architecture (analogous to SwiftUI's `.toolbar {}` modifier):
 *
 *   Window
 *   ├── TitleBar (renders portal target <div>s via callback refs)
 *   └── ToolbarPortalProvider (exposes targets to children via context)
 *       └── App component
 *           └── <Toolbar center={<Search />} trailing={<CreateBtn />} />
 *               ↳ createPortal() into the TitleBar's target divs
 *
 * In legacy eras the context reports `isModern: false` and the
 * <Toolbar> component renders nothing — the app should fall back
 * to its own in-app header.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/* ───────────── Types ───────────── */

interface ToolbarPortalTargets {
  leading: HTMLDivElement | null;
  center: HTMLDivElement | null;
  trailing: HTMLDivElement | null;
}

interface ToolbarContextValue extends ToolbarPortalTargets {
  /** True when the active era uses the modern unified toolbar (Big Sur / Liquid Glass) */
  isModern: boolean;
}

/* ───────────── Context ───────────── */

const ToolbarCtx = createContext<ToolbarContextValue>({
  leading: null,
  center: null,
  trailing: null,
  isModern: false,
});

/* ───────────── Hook: create portal target state (used by Window) ───────────── */

/**
 * Creates the mutable state that holds references to the three portal-target
 * DOM nodes rendered inside `<TitleBar>`. Window calls this hook, passes the
 * setters to TitleBar (via props) and the resolved targets to the provider.
 */
export function useToolbarPortalTargets() {
  const [targets, setTargets] = useState<ToolbarPortalTargets>({
    leading: null,
    center: null,
    trailing: null,
  });

  // Stable callback refs — TitleBar attaches these to its <div>s.
  const setLeadingRef = useCallback((node: HTMLDivElement | null) => {
    setTargets((prev) => (prev.leading === node ? prev : { ...prev, leading: node }));
  }, []);

  const setCenterRef = useCallback((node: HTMLDivElement | null) => {
    setTargets((prev) => (prev.center === node ? prev : { ...prev, center: node }));
  }, []);

  const setTrailingRef = useCallback((node: HTMLDivElement | null) => {
    setTargets((prev) => (prev.trailing === node ? prev : { ...prev, trailing: node }));
  }, []);

  return { targets, setLeadingRef, setCenterRef, setTrailingRef };
}

/* ───────────── Provider (used by Window) ───────────── */

export function ToolbarPortalProvider({
  targets,
  isModern,
  children,
}: {
  targets: ToolbarPortalTargets;
  isModern: boolean;
  children: ReactNode;
}) {
  return (
    <ToolbarCtx.Provider value={{ ...targets, isModern }}>
      {children}
    </ToolbarCtx.Provider>
  );
}

/* ───────────── Hook: read toolbar state (used by apps) ───────────── */

/**
 * Returns `{ isModern }` so an app can decide whether to render its
 * own in-app header (legacy eras) or rely on the OS toolbar (modern eras).
 */
export function useToolbar() {
  const ctx = useContext(ToolbarCtx);
  return { isModern: ctx.isModern };
}

/* ───────────── <Toolbar> component (used by apps) ───────────── */

/**
 * Portals children into the title bar's toolbar slots.
 *
 * ```tsx
 * <Toolbar
 *   center={<SearchBar />}
 *   trailing={<><CreateBtn /><AccountBtn /></>}
 * />
 * ```
 *
 * Renders nothing in legacy eras — apps should conditionally show
 * their own in-app header using `useToolbar().isModern`.
 */
export function Toolbar({
  leading,
  center,
  trailing,
}: {
  leading?: ReactNode;
  center?: ReactNode;
  trailing?: ReactNode;
}) {
  const ctx = useContext(ToolbarCtx);

  // Nothing to portal into in legacy mode
  if (!ctx.isModern) return null;

  return (
    <>
      {leading && ctx.leading ? createPortal(leading, ctx.leading) : null}
      {center && ctx.center ? createPortal(center, ctx.center) : null}
      {trailing && ctx.trailing ? createPortal(trailing, ctx.trailing) : null}
    </>
  );
}
