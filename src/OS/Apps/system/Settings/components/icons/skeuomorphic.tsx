/**
 * Skeuomorphic (2007) — Detailed icons with lighting and depth
 *
 * Leopard–Mavericks / iOS 6 style. Thicker strokes, subtle gradients implied
 * through opacity layers. White glyphs with gray shading.
 */

import type { GlyphSet } from "./types";

const svgProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Paintbrush with bristle detail */
const Appearance = () => (
  <svg {...svgProps}>
    <path d="M14.5 2.5c1.1-1.1 3-.3 2.8 1.2-.2 1.5-2 3.8-4.3 6.1l-2.5 2.5c-.6.6-1.5.8-2.3.5l-1-.4c-.5-.2-1.1-.1-1.5.3L4 14.5c-.8.8-1.8 1.5-2.5 2 .3-.9.5-1.8.8-2.5l1.5-2.8c.3-.5.3-1.1 0-1.5L3.4 9c-.4-.7-.3-1.5.3-2.1L14.5 2.5z" />
    <path d="M12 5l2 2" opacity="0.5" />
    <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" opacity="0.6" />
  </svg>
);

/** Monitor with reflection */
const DesktopDock = () => (
  <svg {...svgProps}>
    <rect x="2" y="3" width="16" height="11" rx="1.5" />
    <line x1="10" y1="14" x2="10" y2="17" />
    <line x1="7" y1="17" x2="13" y2="17" />
    {/* Screen glare */}
    <path d="M4 5l2 0" opacity="0.4" strokeWidth="1" />
    <path d="M4 6.5l3 0" opacity="0.3" strokeWidth="1" />
  </svg>
);

/** Windows with depth */
const Windows = () => (
  <svg {...svgProps}>
    <rect x="3" y="5" width="10" height="8" rx="1.5" />
    <line x1="3" y1="7.5" x2="13" y2="7.5" />
    {/* Traffic light dots */}
    <circle cx="5" cy="6.25" r="0.6" fill="currentColor" stroke="none" opacity="0.5" />
    <circle cx="6.8" cy="6.25" r="0.6" fill="currentColor" stroke="none" opacity="0.5" />
    <circle cx="8.6" cy="6.25" r="0.6" fill="currentColor" stroke="none" opacity="0.5" />
    <path d="M7 5V4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5v7a1.5 1.5 0 0 1-1.5 1.5H13" />
  </svg>
);

/** Bell with depth ring */
const Notifications = () => (
  <svg {...svgProps}>
    <path d="M10 2.5a5 5 0 0 0-5 5v2.5L3.5 13a.75.75 0 0 0 .55 1.25h11.9a.75.75 0 0 0 .55-1.25L15 10V7.5a5 5 0 0 0-5-5z" />
    <path d="M8 14.25a2 2 0 0 0 4 0" />
    <line x1="10" y1="2.5" x2="10" y2="1.5" />
    {/* Highlight */}
    <path d="M7 7a3 3 0 0 1 3-2" opacity="0.35" strokeWidth="1" />
  </svg>
);

/** Shield with keyhole */
const Privacy = () => (
  <svg {...svgProps}>
    <path d="M10 2L3.5 5.5v4c0 4.5 3 8 6.5 9 3.5-1 6.5-4.5 6.5-9v-4L10 2z" />
    <circle cx="10" cy="9" r="1.5" fill="currentColor" stroke="none" opacity="0.5" />
    <path d="M10 10.5v2" strokeWidth="2" opacity="0.5" />
  </svg>
);

/** Accessibility figure with arms */
const Accessibility = () => (
  <svg {...svgProps}>
    <circle cx="10" cy="10" r="8" />
    <circle cx="10" cy="6.5" r="1.25" fill="currentColor" stroke="none" opacity="0.7" />
    <path d="M6.5 9.5h7" strokeWidth="2" />
    <path d="M8 9.5l-.5 5.5" />
    <path d="M12 9.5l.5 5.5" />
  </svg>
);

export const skeuomorphicGlyphs: GlyphSet = {
  appearance: Appearance,
  "desktop-dock": DesktopDock,
  windows: Windows,
  notifications: Notifications,
  privacy: Privacy,
  accessibility: Accessibility,
};
