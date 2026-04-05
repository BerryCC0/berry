# Era-Adaptive Settings Icons — Design Spec

## Overview

The Settings category nav icons should reflect the visual language of the currently active era theme. Instead of a single static icon set, each era defines its own icon style — making Settings itself a showcase of the design era.

## Current State

Six categories, each with a monochrome SVG on a colored rounded-rect badge (macOS Ventura style). This is correct for **Big Sur** era but feels anachronistic for System 1 or Aqua.

## Architecture

### Rendering Layers

Each icon has two independent visual aspects:

1. **Badge** — the background shape and material (rect, circle, pill, none)
2. **Glyph** — the icon artwork itself (pixel art, line art, filled, glossy, etc.)

Both layers adapt per-era. The `CategoryIcon` component selects the appropriate renderer based on the active `era` from the settings store.

### Component Structure

```
CategoryIcon
├── reads `era` from settingsStore
├── selects BadgeRenderer[era]
└── selects GlyphRenderer[era][categoryId]
```

A single `CategoryIcon` component handles all eras. Each era defines:

- `badge`: CSS class or inline styles for the background treatment
- `glyphs`: A map of `CategoryId → ReactNode` (SVG elements)

```typescript
interface EraIconSet {
  badge: (color: string) => React.CSSProperties;
  glyphs: Record<CategoryId, () => ReactNode>;
}

const ERA_ICON_SETS: Record<EraId, EraIconSet> = { ... };
```

### Data Flow

```
settingsStore.appearance.era
  → CategoryIcon reads era via useSettingsStore
  → Selects EraIconSet for that era
  → Renders badge + glyph
```

No prop drilling — the icon component subscribes directly to the store.

---

## Era Icon Definitions

### System 1 (1984)

**Reference:** Original Macintosh desktop, Susan Kare's icon work

- **Badge:** None. Icons float directly on the background with no container.
- **Glyphs:** 1-bit pixel art on a 16×16 or 32×32 grid. Black pixels only (or white-on-black in dark mode). No anti-aliasing, no fractional coordinates. Every path snaps to whole pixels.
- **Rendering:** Use SVG `<rect>` elements to draw individual pixels, or a single `<path>` with the pixel grid encoded. Set `shape-rendering: crispEdges`.
- **Color:** Monochrome. Active state: inverted (white on black).

| Category | Glyph Description |
|---|---|
| Appearance | Paint palette — 5×5 grid with dithered fill pattern |
| Desktop & Dock | Classic Mac — rounded rect monitor with horizontal lines |
| Windows | Overlapping rectangles with title bar lines |
| Notifications | Bell silhouette, 1-bit |
| Privacy | Padlock, closed |
| Accessibility | Figure with outstretched arms (Universal Access style) |

### Platinum (1997)

**Reference:** Mac OS 8/9, grayscale toolbar icons

- **Badge:** Subtle raised bevel. Light gray (#DDDDDD) fill, 1px white highlight on top-left, 1px dark gray (#999999) shadow on bottom-right. Rounded rect (2px radius).
- **Glyphs:** 2-color with grayscale shading. Slightly thicker strokes (2px) than Big Sur. Simple, recognizable silhouettes with a pixel-hinted feel.
- **Rendering:** SVG with `stroke-width: 2`, muted fills. Gray palette only: black, #666, #999, #CCC, white.
- **Color:** Grayscale. No colored badges.

| Category | Glyph Description |
|---|---|
| Appearance | Paintbrush at 45°, gray bristles |
| Desktop & Dock | CRT monitor with stand |
| Windows | Overlapping window frames with Platinum title bar styling |
| Notifications | Bell with clapper detail |
| Privacy | Shield, flat gray fill |
| Accessibility | Wheelchair symbol (period-appropriate) |

### Aqua (2001)

**Reference:** Mac OS X 10.0–10.6, System Preferences icons

- **Badge:** Glossy gel button. Rounded rect with generous radius (6px). Saturated solid color fill with a white-to-transparent gradient overlay on the top ~40% (the classic Aqua "shine"). Subtle 1px darker border. Drop shadow (0 1px 3px rgba(0,0,0,0.3)).
- **Glyphs:** White filled icons (not just strokes). Softer, rounder shapes than Platinum. Slight drop shadow on the glyph itself.
- **Rendering:** SVG with `fill: white`, optional thin white stroke for definition. Badge background uses CSS gradient.
- **Color per category:** Saturated Aqua palette:
  - Appearance: Orange (#FF9500)
  - Desktop & Dock: Blue (#0066CC)
  - Windows: Green (#33CC33)
  - Notifications: Red (#CC3333)
  - Privacy: Purple (#9933CC)
  - Accessibility: Blue (#3366FF)

### Skeuomorphic (2007)

**Reference:** Mac OS X 10.5–10.9 (Leopard–Mavericks), iOS 6 Settings

- **Badge:** Rounded rect with subtle inner shadow and a barely-visible noise texture overlay. Slight gradient (top lighter, bottom darker). More matte than Aqua — less shine, more depth.
- **Glyphs:** Detailed, semi-realistic icons with lighting from top-left. Thicker than flat/Big Sur. White with subtle gray shading to imply dimensionality. Think iOS 6 Settings row icons.
- **Rendering:** SVG with fills + gentle gradients using `<linearGradient>`. Consider `<filter>` for subtle inner shadow.
- **Color per category:** Slightly desaturated from Aqua, warmer tones:
  - Appearance: Warm gray (#8E8E93)
  - Desktop & Dock: Steel blue (#4A90D9)
  - Windows: Forest green (#5DA84E)
  - Notifications: Coral red (#D94A4A)
  - Privacy: Slate purple (#7B68AE)
  - Accessibility: Teal (#4AA8A8)

### Flat (2013)

**Reference:** iOS 7–12, OS X Yosemite–Catalina System Preferences

- **Badge:** Circular. Solid flat color, no gradient, no shadow, no border. Clean and minimal.
- **Glyphs:** Thin-weight line icons (stroke-width: 1.25). Open paths where possible. Geometric, not organic. Consistent optical weight across all six.
- **Rendering:** SVG stroke-only, no fills. `stroke-linecap: round`, `stroke-linejoin: round`.
- **Color per category:** iOS 7 palette (vibrant, high-saturation):
  - Appearance: Orange (#FF9500)
  - Desktop & Dock: Blue (#007AFF)
  - Windows: Green (#4CD964)
  - Notifications: Red (#FF3B30)
  - Privacy: Purple (#5856D6)
  - Accessibility: Blue (#007AFF)

### Big Sur (2020)

**Reference:** macOS Big Sur–Sonoma, current System Settings

- **Badge:** Squircle (rounded rect with ~22% corner radius). Solid color fill. No gradient, no shadow. This is the current implementation.
- **Glyphs:** SF Symbol-weight line icons (stroke-width: 1.5). Balanced between thin (Flat) and thick (Skeuomorphic). Filled accents where helpful (e.g., the dot in the paintbrush, the person's head in accessibility).
- **Rendering:** Current SVG implementation is correct for this era. No changes needed.
- **Color per category:** Standard macOS system colors (current implementation).

### Liquid Glass (2025)

**Reference:** iOS 26 / macOS Tahoe, WWDC 2025 Liquid Glass design language

- **Badge:** Frosted glass material. Rounded rect with a translucent white fill (rgba(255,255,255,0.25)), backdrop-filter blur (12–16px), and a subtle 1px border of rgba(255,255,255,0.3). In dark mode: rgba(255,255,255,0.1) fill with rgba(255,255,255,0.15) border. The badge should feel like a floating piece of glass.
- **Glyphs:** Same weight as Big Sur (stroke-width: 1.5) but with a subtle tint rather than pure white — inherits from the category's accent color at reduced opacity. The glyph should feel embedded in the glass, not sitting on top of it.
- **Rendering:** SVG with `stroke: currentColor`. Badge uses CSS `backdrop-filter: blur(14px) saturate(180%)`. Consider a subtle `box-shadow: inset 0 1px 0 rgba(255,255,255,0.3)` for the glass edge highlight.
- **Color:** The badge itself is colorless (frosted). The glyph carries the accent color. In the active state, the glass tints toward the accent color.

---

## Interaction States

Each era should handle these states in its own idiom:

| State | System 1 | Platinum | Aqua | Skeuomorphic | Flat | Big Sur | Liquid Glass |
|---|---|---|---|---|---|---|---|
| **Default** | Black glyph | Raised bevel | Glossy badge | Gradient badge | Solid circle | Solid squircle | Frosted glass |
| **Hover** | Inverted rect | Darker bevel | Brighter shine | Subtle glow | Lighter fill | Lighter fill | Increased blur + glow |
| **Active/Selected** | Inverted (white on black) | Pressed bevel (swapped highlights) | Darker, pressed shine | Inner shadow | White glyph, darker fill | White glyph (current) | Glass tints to accent color |
| **Dark mode** | White on black (always) | Silver/chrome bevel | Deeper saturation | Darker gradient, same structure | Same hues, lower brightness | Same hues, lower brightness | Darker glass, brighter glyph |

---

## Implementation Plan

### Phase 1 — Glyph Sets (SVG artwork)

Create all 42 glyphs (7 eras × 6 categories). Organize as:

```
components/icons/
├── system1.tsx    — 16×16 pixel art glyphs
├── platinum.tsx   — Grayscale beveled glyphs
├── aqua.tsx       — White filled glyphs
├── skeuomorphic.tsx — Detailed gradient glyphs
├── flat.tsx       — Thin stroke glyphs
├── bigSur.tsx     — Current glyphs (move from CategoryNav.tsx)
└── liquidGlass.tsx — Tinted stroke glyphs
```

Each file exports a `Record<CategoryId, () => ReactNode>`.

### Phase 2 — Badge Renderers

Create badge styles per era. Most can be pure CSS (applied via className or inline styles). Aqua and Skeuomorphic need CSS gradients. Liquid Glass needs `backdrop-filter`. System 1 needs no badge at all.

```
components/icons/badges.module.css
```

With classes: `.badgeSystem1`, `.badgePlatinum`, `.badgeAqua`, etc.

### Phase 3 — Adaptive CategoryIcon

Refactor `CategoryIcon` to:

1. Read `era` from `useSettingsStore`
2. Look up `ERA_ICON_SETS[era]`
3. Render the appropriate badge + glyph

```typescript
function CategoryIcon({ id, size }: { id: CategoryId; size?: "small" | "large" }) {
  const era = useSettingsStore((s) => s.settings.appearance.era);
  const iconSet = ERA_ICON_SETS[era];
  const Glyph = iconSet.glyphs[id];
  const badgeStyle = iconSet.badge(ICON_COLORS[id]);

  return (
    <span className={styles.iconBadge} style={badgeStyle}>
      <Glyph />
    </span>
  );
}
```

### Phase 4 — Polish & Dark Mode

- Add dark mode variants for each badge style
- Verify contrast ratios (WCAG AA minimum) for all era × dark mode combinations
- Test active/selected states across all eras
- Ensure `crispEdges` rendering for System 1 pixel art at all display densities

---

## Design Constraints

- **All SVG, no raster.** Every glyph is vector so it scales cleanly.
- **No external icon libraries.** All icons are hand-authored to match each era precisely.
- **Consistent hit targets.** Badge size stays the same across eras (24px sidebar, 32px grid). Only the visual treatment changes.
- **Performance.** 42 SVG glyphs are tiny. No lazy loading needed. Tree-shaking not necessary since only one era's set is rendered at a time, but all are bundled (they're small).
- **Accessibility.** Icons are decorative (labels carry the meaning). Use `aria-hidden="true"` on all icon SVGs. Ensure sufficient contrast between badge and background in all era × dark mode combinations.

---

## Design Decisions

1. **Nouns skin interaction** — Icons are untouched by Nouns skin. The skin applies to chrome/backgrounds/accents but the era icons stay true to their era's visual language.
2. **Transition animation** — 150ms crossfade when switching eras. Apply `transition: opacity 150ms ease` on the icon badge wrapper; swap content after fade-out.
3. **Mobile grid** — Author two pixel densities for System 1: 16×16 glyphs at sidebar size (24px), 32×32 glyphs at grid size (32px). Both use `shape-rendering: crispEdges`.
4. **Platinum dark mode** — Invent a plausible "what if" dark Platinum: chrome/silver bevels on dark gray (#3A3A3A) background. Highlight edges become subtle silver (#AAAAAA), shadow edges become near-black. Glyphs render in light gray (#CCCCCC) instead of black.
