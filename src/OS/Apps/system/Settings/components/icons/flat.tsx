/**
 * Flat (2013) — Thin-weight line icons
 *
 * iOS 7–12 / Yosemite–Catalina style.
 * Stroke-width 1.25, open paths, geometric shapes. No fills.
 */

import type { GlyphSet } from "./types";

const svgProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Paintbrush — thin */
const Appearance = () => (
  <svg {...svgProps}>
    <path d="M15 2c1-1 2.5 0 2.2 1.3-.3 1.5-2.2 4-4.7 6.5L10.2 12c-.5.5-1.2.7-1.8.4l-1-.4c-.4-.2-.9 0-1.2.3L4.5 14.5c-.6.6-1.2 1.5-1.7 2 .2-.7.4-1.5.7-2.2l1.3-2.6c.2-.4.2-.9 0-1.3l-.4-.7c-.3-.5-.2-1.2.3-1.7L15 2z" />
  </svg>
);

/** Display — minimal */
const DesktopDock = () => (
  <svg {...svgProps}>
    <rect x="2.5" y="3" width="15" height="10.5" rx="1.5" />
    <line x1="10" y1="13.5" x2="10" y2="16.5" />
    <line x1="7" y1="16.5" x2="13" y2="16.5" />
  </svg>
);

/** Windows — geometric */
const Windows = () => (
  <svg {...svgProps}>
    <rect x="2.5" y="5.5" width="10" height="7.5" rx="1" />
    <path d="M7 5.5V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-3.5" />
  </svg>
);

/** Bell — open */
const Notifications = () => (
  <svg {...svgProps}>
    <path d="M10 2.5a5 5 0 0 0-5 5v3l-1.5 2h13l-1.5-2v-3a5 5 0 0 0-5-5z" />
    <path d="M8.25 14.5a1.75 1.75 0 0 0 3.5 0" />
  </svg>
);

/** Shield — outline only */
const Privacy = () => (
  <svg {...svgProps}>
    <path d="M10 2L3.5 5.5v4c0 4.5 3 8 6.5 9 3.5-1 6.5-4.5 6.5-9v-4L10 2z" />
  </svg>
);

/** Accessibility — circle + figure */
const Accessibility = () => (
  <svg {...svgProps}>
    <circle cx="10" cy="10" r="8" />
    <circle cx="10" cy="7" r="1" />
    <line x1="6.5" y1="9.5" x2="13.5" y2="9.5" />
    <path d="M8 9.5l-1 6" />
    <path d="M12 9.5l1 6" />
  </svg>
);

export const flatGlyphs: GlyphSet = {
  appearance: Appearance,
  "desktop-dock": DesktopDock,
  windows: Windows,
  notifications: Notifications,
  privacy: Privacy,
  accessibility: Accessibility,
};
