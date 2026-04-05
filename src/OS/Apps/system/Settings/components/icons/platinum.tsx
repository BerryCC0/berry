/**
 * Platinum (1997) — Grayscale beveled icons
 *
 * Mac OS 8/9 aesthetic: 2px strokes, muted grays, slightly pixel-hinted.
 * Dark mode: chrome/silver on dark gray — a plausible "what if" dark Platinum.
 */

import type { GlyphSet } from "./types";

const svgProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Paintbrush — Appearance */
const Appearance = () => (
  <svg {...svgProps}>
    <path d="M14 3c1-1 3 0 2.5 1.5S13 9 11 11l-2 2c-.5.5-1.2.6-1.8.3l-1.2-.6c-.4-.2-.9-.1-1.2.2L3.5 14.5c-.5.5-1 1.5-1.5 2 .3-.8.5-1.5.8-2.2L4 12c.3-.5.3-1 0-1.4l-.5-.8c-.4-.6-.2-1.4.4-1.8L14 3z" />
  </svg>
);

/** CRT monitor — Desktop & Dock */
const DesktopDock = () => (
  <svg {...svgProps}>
    <rect x="2" y="2" width="16" height="12" rx="2" />
    <rect x="4" y="4" width="12" height="8" rx="0" fill="currentColor" opacity="0.15" stroke="none" />
    <line x1="10" y1="14" x2="10" y2="17" />
    <line x1="6" y1="17" x2="14" y2="17" />
  </svg>
);

/** Overlapping windows with Platinum title bars */
const Windows = () => (
  <svg {...svgProps}>
    <rect x="3" y="5" width="10" height="8" rx="1" />
    <line x1="3" y1="7.5" x2="13" y2="7.5" />
    <path d="M7 5V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2" />
    <line x1="7" y1="5.5" x2="16" y2="5.5" />
  </svg>
);

/** Bell with clapper — Notifications */
const Notifications = () => (
  <svg {...svgProps}>
    <path d="M10 2.5a5 5 0 0 0-5 5v2.5L3.5 13a.75.75 0 0 0 .55 1.25h11.9a.75.75 0 0 0 .55-1.25L15 10V7.5a5 5 0 0 0-5-5z" />
    <line x1="10" y1="2.5" x2="10" y2="1.5" />
    <path d="M8 14.25a2 2 0 0 0 4 0" />
  </svg>
);

/** Shield — Privacy */
const Privacy = () => (
  <svg {...svgProps}>
    <path d="M10 2L3.5 5.5v4c0 4.5 3 8 6.5 9 3.5-1 6.5-4.5 6.5-9v-4L10 2z" />
    <rect x="8.5" y="7.5" width="3" height="4" rx="0.5" fill="currentColor" opacity="0.2" stroke="none" />
  </svg>
);

/** Figure — Accessibility */
const Accessibility = () => (
  <svg {...svgProps}>
    <circle cx="10" cy="5" r="1.5" fill="currentColor" opacity="0.3" />
    <line x1="6" y1="8.5" x2="14" y2="8.5" />
    <line x1="10" y1="8.5" x2="10" y2="13" />
    <line x1="10" y1="13" x2="7.5" y2="17" />
    <line x1="10" y1="13" x2="12.5" y2="17" />
  </svg>
);

export const platinumGlyphs: GlyphSet = {
  appearance: Appearance,
  "desktop-dock": DesktopDock,
  windows: Windows,
  notifications: Notifications,
  privacy: Privacy,
  accessibility: Accessibility,
};
