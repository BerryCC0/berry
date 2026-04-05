/**
 * Aqua (2001) — White filled icons on glossy gel badges
 *
 * Mac OS X 10.0–10.6 System Preferences style.
 * Filled white glyphs with soft rounded shapes.
 */

import type { GlyphSet } from "./types";

const svgProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 20 20",
  fill: "currentColor",
  stroke: "none",
};

/** Paintbrush — Appearance */
const Appearance = () => (
  <svg {...svgProps}>
    <path d="M15 2.3c1.2-1 2.8.1 2.5 1.6-.4 2-2.5 4.5-5 7L10.5 13c-.5.5-1.2.7-1.9.4l-1-.4c-.4-.2-.9-.1-1.2.3L4.5 15.5c-.6.6-1.2 1.2-1.8 1.7.2-.7.5-1.5.8-2.2l1.2-2.5c.2-.5.2-1 0-1.3l-.4-.7c-.3-.6-.2-1.3.3-1.7L15 2.3z" />
  </svg>
);

/** Monitor — Desktop & Dock */
const DesktopDock = () => (
  <svg {...svgProps}>
    <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h13A1.5 1.5 0 0 1 18 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 13.5v-9zM8.5 15h3v2h-3v-2zM6 17.5h8" />
  </svg>
);

/** Windows — overlapping */
const Windows = () => (
  <svg {...svgProps}>
    <rect x="2" y="5" width="11" height="9" rx="1.5" />
    <rect x="2" y="5" width="11" height="2.5" rx="1.5" opacity="0.7" />
    <path d="M7 5V3.5A1.5 1.5 0 0 1 8.5 2h8A1.5 1.5 0 0 1 18 3.5v8a1.5 1.5 0 0 1-1.5 1.5H13" />
    <rect x="7" y="2" width="11" height="2.5" rx="1.5" opacity="0.7" />
  </svg>
);

/** Bell — Notifications */
const Notifications = () => (
  <svg {...svgProps}>
    <path d="M10 1.5a5.5 5.5 0 0 0-5.5 5.5v3L3 12.5c-.4.5 0 1.25.7 1.25h12.6c.7 0 1.1-.75.7-1.25L15.5 10V7a5.5 5.5 0 0 0-5.5-5.5z" />
    <path d="M8 13.75a2 2 0 0 0 4 0" />
  </svg>
);

/** Shield with checkmark — Privacy */
const Privacy = () => (
  <svg {...svgProps}>
    <path d="M10 1.5L3 5.25v4.25c0 4.75 3.2 8.5 7 9.5 3.8-1 7-4.75 7-9.5V5.25L10 1.5z" />
    <path d="M7.5 10l2 2 3.5-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
  </svg>
);

/** Accessibility figure */
const Accessibility = () => (
  <svg {...svgProps}>
    <circle cx="10" cy="5.5" r="2" />
    <path d="M5.5 9h9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M10 9v5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M10 14l-2.5 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M10 14l2.5 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
  </svg>
);

export const aquaGlyphs: GlyphSet = {
  appearance: Appearance,
  "desktop-dock": DesktopDock,
  windows: Windows,
  notifications: Notifications,
  privacy: Privacy,
  accessibility: Accessibility,
};
