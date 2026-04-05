/**
 * Berry OS Shell Exports
 *
 * The Shell layer contains all OS chrome: window management, dock,
 * menu bar, desktop, and lifecycle overlays.
 */

// Shell Components
export { Desktop } from "./Desktop";
export { Window } from "./Window";
export { MenuBar } from "./MenuBar";
export { Dock } from "./Dock";
export { WindowManager } from "./WindowManager";
export { AppErrorBoundary } from "./AppErrorBoundary";
export { Launchpad } from "./Launchpad";

// Lifecycle Overlays
export { BootOverlay, ShutdownOverlay, SleepOverlay } from "./Boot";

// Primitives (re-exported for convenience — canonical location is @/OS/Primitives)
export {
  Button,
  Dialog,
  AlertDialog,
  ConfirmDialog,
  ScrollArea,
} from "@/OS/Primitives";
export type { ButtonVariant, ButtonSize, DialogAction } from "@/OS/Primitives";

