/**
 * OS Apps - Export all OS apps and config
 *
 * Apps are organized by category:
 *   system/     — Finder, Settings, WalletPanel
 *   utilities/  — Calculator, TextEditor, ImageViewer, SoundJam, MoviePlayer, PDFViewer
 *   nouns/      — Auction, Camp, Treasury, Nounspot, CrystalBall, Probe, Clients
 *   social/     — BIM
 *
 * Note: No Trash app - filesystem is read-only per FILESYSTEM.md
 */

export { osAppConfigs, getOSAppConfig } from "./OSAppConfig";
export { Finder } from "./system/Finder/Finder";
export { Calculator } from "./utilities/Calculator/Calculator";
export { Settings } from "./system/Settings/Settings";

