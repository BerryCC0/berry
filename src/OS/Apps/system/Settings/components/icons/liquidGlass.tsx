/**
 * Liquid Glass (2025) — Frosted glass icons with tinted strokes
 *
 * iOS 26 / macOS Tahoe aesthetic. Same glyph weight as Big Sur (1.5px)
 * but strokes inherit the category accent color via currentColor.
 * The badge provides the frosted glass material; glyphs feel embedded.
 */

import type { GlyphSet } from "./types";

const svgProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Paintbrush — Appearance */
const Appearance = () => (
  <svg {...svgProps}>
    <path d="M14.5 2.5c1.1-1.1 3-.3 2.8 1.2-.2 1.5-2 3.8-4.3 6.1l-2.5 2.5c-.6.6-1.5.8-2.3.5l-1-.4c-.5-.2-1.1-.1-1.5.3L4 14.5c-.8.8-1.8 1.5-2.5 2 .3-.9.5-1.8.8-2.5l1.5-2.8c.3-.5.3-1.1 0-1.5L3.4 9c-.4-.7-.3-1.5.3-2.1L14.5 2.5z" />
    <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
  </svg>
);

/** Display — Desktop & Dock */
const DesktopDock = () => (
  <svg {...svgProps}>
    <rect x="2" y="3" width="16" height="11" rx="1.5" />
    <line x1="10" y1="14" x2="10" y2="17" />
    <line x1="7" y1="17" x2="13" y2="17" />
  </svg>
);

/** Overlapping rectangles — Windows */
const Windows = () => (
  <svg {...svgProps}>
    <rect x="3" y="5" width="10" height="8" rx="1.5" />
    <path d="M7 5V4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5v7a1.5 1.5 0 0 1-1.5 1.5H13" />
  </svg>
);

/** Bell — Notifications */
const Notifications = () => (
  <svg {...svgProps}>
    <path d="M10 2.5a5 5 0 0 0-5 5v2.5L3.5 13a.75.75 0 0 0 .55 1.25h11.9a.75.75 0 0 0 .55-1.25L15 10V7.5a5 5 0 0 0-5-5z" />
    <path d="M8 14.25a2 2 0 0 0 4 0" />
  </svg>
);

/** Shield with checkmark — Privacy */
const Privacy = () => (
  <svg {...svgProps}>
    <path d="M10 2L3.5 5.5v4c0 4.5 3 8 6.5 9 3.5-1 6.5-4.5 6.5-9v-4L10 2z" />
    <path d="M7.5 10l2 2 3.5-4" />
  </svg>
);

/** Accessibility figure */
const Accessibility = () => (
  <svg {...svgProps}>
    <circle cx="10" cy="10" r="8" />
    <circle cx="10" cy="7" r="1.25" fill="currentColor" stroke="none" />
    <path d="M6.5 9.5h7" />
    <path d="M8 9.5l-.5 5.5" />
    <path d="M12 9.5l.5 5.5" />
  </svg>
);

export const liquidGlassGlyphs: GlyphSet = {
  appearance: Appearance,
  "desktop-dock": DesktopDock,
  windows: Windows,
  notifications: Notifications,
  privacy: Privacy,
  accessibility: Accessibility,
};
