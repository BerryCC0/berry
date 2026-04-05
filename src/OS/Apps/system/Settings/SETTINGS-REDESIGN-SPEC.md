# Settings App Redesign Spec

## Design Direction

**macOS Ventura+ System Settings** — full-width grouped content, responsive for mobile. The settings UI picks up era tokens (border-radius, shadows, spacing) subtly but doesn't dramatically reshape controls per era.

---

## Navigation: Replace Sidebar with Top-Level Grid → Detail Drill-Down

### Current Problem
The fixed 200px sidebar wastes space on desktop and breaks on mobile. 8 text-only buttons with no icons make it hard to scan.

### New Pattern

**Desktop (≥768px):** Two-column split view.
- Left column (240px): scrollable category list with icons. Always visible.
- Right column: scrollable panel content.
- No back button needed — categories are always accessible.

**Mobile (<768px):** Single-column drill-down.
- Landing screen shows all categories as a grid of tappable cards (icon + label).
- Tapping a category pushes the detail panel full-screen with a back arrow.
- Matches iOS Settings UX that mobile users already understand.

### Categories (Reorganized)

Reduce from 8 to 6 primary categories by merging related settings:

| Icon | Category | Contains |
|------|----------|----------|
| 🎨 | **Appearance** | Theme, accent color, Nouns skin, font size, reduce motion, reduce transparency |
| 🖥️ | **Desktop & Dock** | Wallpaper, desktop icons, icon grid, dock position, dock auto-hide, pinned apps, Berry menu apps |
| 🪟 | **Windows** | Shadows, snapping, snap threshold, remember positions, max windows |
| 🔔 | **Notifications** | Enable, sounds, position, duration |
| 🔒 | **Privacy & Data** | Wallet memory, clear on disconnect, ENS resolution, clear data |
| ♿ | **Accessibility** | High contrast, large targets, focus indicators, keyboard nav, screen reader |

**Removed:**
- **Language** → merge into a "General" subsection or footer control (it's one dropdown)
- **About** → move to footer of the Settings window or a small info popover from the title bar

**Why:** Every category now has enough settings to justify its own panel. Language was a wasted full panel for one control.

---

## Appearance Panel: The Big Overhaul

### Core Model Change: Eras, Not Themes

**Current problem:** 17 "themes" (berry-classic, berry-dark, aqua, aqua-dark, nouns, nouns-dark, etc.) are really just combinations of era + light/dark + Nouns branding. Users pick from a 17-item dropdown with no preview and no way to understand the structure.

**New model:** Three independent axes that compose together:

```
Era (1 of 7)  ×  Dark Mode (on/off)  ×  Nouns Skin (on/off)
```

This means 7 selectable eras, not 17 themes. Dark mode and Nouns are toggles. The math is the same coverage (7 × 2 × 2 = 28 possible combos, more than the old 17), but the UX is dramatically simpler.

### Data Model Change

**Before:**
```ts
appearance: {
  themeId: "aqua-dark"    // one of 17 opaque strings
  windowStyle: "aqua"     // redundant — derived from themeId
  nounsSkin: { enabled, intensity, ... }
}
```

**After:**
```ts
appearance: {
  era: "aqua"             // one of 7: system1, platinum, aqua, skeuomorphic, flat, big-sur, liquid-glass
  darkMode: boolean       // light or dark variant of the era
  nounsSkin: {             // independent overlay
    enabled: boolean
    intensity: number     // 0–100
    primaryColor: string
    bgTint: string
    coolBg: string
    warmBg: string
  }
  accentColor: string
  fontSize: "small" | "default" | "large"
  reduceMotion: boolean
  reduceTransparency: boolean
}
```

The `windowStyle` field becomes redundant — it's always derived from `era`. The `themeId` field goes away. Each era defines its own light and dark color palettes internally (already the case in `defaults.ts`, just keyed differently).

**Migration:** On first load, map old `themeId` values to the new `era + darkMode` pair:
- `"berry-classic"` → `era: "platinum", darkMode: false`
- `"berry-dark"` → `era: "platinum", darkMode: true`
- `"aqua"` → `era: "aqua", darkMode: false`
- `"aqua-dark"` → `era: "aqua", darkMode: true`
- `"nouns"` → `era: "flat", darkMode: false, nounsSkin.enabled: true`
- `"nouns-dark"` → `era: "flat", darkMode: true, nounsSkin.enabled: true`
- `"midnight"` → `era: "flat", darkMode: true`
- `"paper"` → `era: "flat", darkMode: false`
- etc.

### Appearance Panel Layout (top to bottom)

**1. Mode Toggles (top of panel)**

A horizontal row with two prominent toggles, always visible:

```
┌─────────────────────────────────┐
│  ☀️ Dark Mode          [toggle] │
│  ⌐◨-◨ Nouns Skin       [toggle] │
└─────────────────────────────────┘
```

These are the most-changed settings — they belong at the very top, not buried.

**2. Era Selection → Visual Card Grid**

A grid of **7 era cards** (not 17). Each card is ~140×90px and shows a mini preview of that era's look:

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ ▪ ▪ ▪    │  │ ● ● ●    │  │ ● ● ●    │
│ ░░░░░░░░ │  │ ░░░░░░░░ │  │ ░░░░░░░░ │
│ ▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓ │
│ System 1  │  │ Platinum  │  │   Aqua    │
│  (1984)   │  │  (1997)   │  │  (2001)   │
└──────────┘  └──────────┘  └──────────┘
```

The preview dynamically reflects current dark mode state — if dark mode is on, the card shows the era's dark palette. The active era card has a highlighted ring/border.

3-up on desktop, 2-up on mobile, 1-up on very narrow screens.

**Eras:**
| Era | Year | Shorthand | Defining Trait |
|-----|------|-----------|---------------|
| System 1 | 1984 | 1-bit computing | Black & white, Chicago font, square everything |
| Platinum | 1997 | The classic Mac | Beveled chrome, pinstripe, gray gradients |
| Aqua | 2001 | Lickable UI | Gel buttons, candy colors, translucency |
| Skeuomorphic | 2007 | Rich & Real | Leather textures, warm shadows, realistic materials |
| Flat | 2013 | Clarity | Clean, borderless, content-first, system colors |
| Big Sur | 2020 | Rounded modern | Gentle gradients, extra-round corners, depth |
| Liquid Glass | 2025 | Glass & light | Translucent materials, refraction, vibrancy |

**3. Nouns Skin Controls (collapsible, shown when skin is enabled)**

Expands below the Nouns toggle when enabled:

| Setting | Control | Description |
|---------|---------|-------------|
| Intensity | Slider (0–100%) | How strongly Nouns colors override the base era |
| Primary Color | ColorPicker | Override Nouns red (default: #D53C5E) |
| Background Tint | ColorPicker | Override background tint |
| Cool Background | ColorPicker | Override cool-bg for glasses gradient |
| Warm Background | ColorPicker | Override warm-bg for glasses gradient |
| Reset to Defaults | Button (secondary) | Restore standard Nouns DAO colors |

**4. Accent Color**

Horizontal row of 36×36px rounded-square swatches. Active swatch gets a ring. "+" swatch at the end opens a custom color picker.

**5. Display Settings**

| Setting | Control |
|---------|---------|
| Font Size | Segmented control: Small / Default / Large |
| Reduce Motion | Toggle |
| Reduce Transparency | Toggle |

### Desktop Section → Moved

Wallpaper and desktop icon size move to "Desktop & Dock" where they belong. The Appearance panel is purely about era/mode/skin/effects.

---

## Desktop & Dock Panel

Absorbs wallpaper controls from Appearance.

### Wallpaper Picker → Visual Grid

Replace the color swatches + URL input with:
- A grid of wallpaper thumbnails (preset colors render as solid squares)
- A "Custom URL" option at the end
- Active wallpaper has a checkmark overlay

### Dock Controls

Keep existing: position, auto-hide, pinned apps. But upgrade the `ChipList` for pinned apps:
- Each chip shows the app icon (16px) next to the name
- Drag-to-reorder support (future enhancement, not blocking)
- "Add App" button opens a small popover with available apps

---

## Shared Control Upgrades

### Replace Native `<select>` with Custom Dropdown

The native `<select>` is the single ugliest element in the UI. Build a custom dropdown component:

```
CustomSelect
├── Trigger button (shows current value + chevron)
├── Dropdown panel (positioned below trigger)
│   ├── Option row (icon? + label + checkmark if active)
│   └── ...
└── Keyboard: arrow keys to navigate, Enter to select, Esc to close
```

Styling picks up era tokens: border-radius from `--berry-border-radius`, shadow from era shadow tokens. On Platinum, the dropdown gets beveled edges. On Liquid Glass, it gets backdrop-filter blur.

### Toggle → More Polished

Current toggle is functional but feels flat. Enhancements:
- Slightly larger on mobile (48×28 for touch targets)
- Smooth spring animation on the thumb (not just linear transition)
- Era-subtle: Platinum gets a raised/embossed look, Aqua gets a glossy track

### Slider → Show Progress Fill

Current slider has no fill — just a thumb on a track. Add:
- Filled portion of the track in accent color (left of thumb)
- Value label that follows the thumb (or stays at right end)

### ColorPicker → Expandable

Current picker is just a tiny native input + preset circles. Upgrade:
- Clicking a swatch applies it immediately
- A "custom" button opens a popover with a full color picker (hex input + hue/saturation square)
- Preset swatches are 32×32 rounded squares, not tiny circles

---

## Layout System

### SettingGroup → Rounded Card

Each group becomes a card with:
- `border-radius: var(--berry-border-radius)` (adapts to era)
- Subtle background: `var(--berry-bg-secondary)`
- Consistent padding: 16px
- Group title sits outside/above the card as a muted label

### SettingRow → Cleaner Spacing

- Increase vertical padding from current 10px to 14px
- Label and description on left, control pinned right
- Description text wraps under label (not beside it) on narrow screens
- Dividers between rows use `var(--berry-border)` at 0.5 opacity

### Responsive Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| ≥768px | Two-column: 240px nav + flexible content |
| <768px | Single column, drill-down navigation |
| <480px | Compact: smaller control sizes, stacked label/control |

---

## About → Window Footer / Info Popover

Move "About" out of the main navigation. Two options:

**Option A (preferred):** Small "About Berry OS" link at the bottom of the category list. Clicking it opens a centered modal/popover with:
- Berry logo
- Version number
- Platform / persistence info
- Wallet info (if connected)
- Credits and links

**Option B:** Info (ⓘ) button in the Settings window title bar that opens the same popover.

---

## Language → Inline Footer Control

Add a small language selector at the very bottom of the category sidebar (desktop) or at the bottom of the category grid (mobile). Just a single dropdown — doesn't need its own panel.

---

## File Structure (New)

```
Settings/
├── Settings.tsx                    → Rewrite: responsive nav + panel routing
├── Settings.module.css             → Rewrite: two-column + mobile drill-down
├── index.ts
├── components/
│   ├── SettingRow.tsx             → Update: better spacing, responsive stacking
│   ├── SettingRow.module.css
│   ├── Controls.tsx               → Major update: CustomSelect, better Toggle/Slider/SegmentedControl
│   ├── Controls.module.css        → Major update: all control styles
│   ├── EraCard.tsx               → NEW: visual era preview card (replaces ThemeCard)
│   ├── EraCard.module.css
│   ├── CategoryNav.tsx            → NEW: icon + label navigation (sidebar/grid)
│   ├── CategoryNav.module.css
│   ├── AboutPopover.tsx           → NEW: about info in popover
│   ├── AboutPopover.module.css
│   └── index.ts
└── panels/
    ├── Panel.module.css           → Update: card-based groups
    ├── AppearancePanel.tsx        → Major rewrite: era grid, dark toggle, Nouns skin
    ├── DesktopDockPanel.tsx       → NEW: merged Desktop + wallpaper
    ├── WindowsPanel.tsx           → Minor update: better controls
    ├── NotificationsPanel.tsx     → Minor update: better controls
    ├── PrivacyPanel.tsx           → Minor update: better controls
    ├── AccessibilityPanel.tsx     → Minor update: better controls
    └── index.ts
```

**Removed files:** `DesktopPanel.tsx`, `LanguagePanel.tsx`, `AboutPanel.tsx`, `ThemeEditorPanel.tsx`

### Settings Store / Defaults Changes

The `defaults.ts` file currently defines 17 `BUILT_IN_THEMES` keyed by `themeId`. This refactors to:

```ts
// New structure
const ERAS = {
  system1:       { light: { colors, typography, windowChrome, ... }, dark: { ... } },
  platinum:      { light: { ... }, dark: { ... } },
  aqua:          { light: { ... }, dark: { ... } },
  skeuomorphic:  { light: { ... }, dark: { ... } },
  flat:          { light: { ... }, dark: { ... } },
  "big-sur":     { light: { ... }, dark: { ... } },
  "liquid-glass": { light: { ... }, dark: { ... } },
};

// Resolved at runtime:
function getActiveTheme(era: EraId, darkMode: boolean, nounsSkin: NounsSkinConfig): CustomTheme {
  const base = ERAS[era][darkMode ? "dark" : "light"];
  return nounsSkin.enabled ? applyNounsSkin(base, nounsSkin) : base;
}
```

The old `themeId` string is replaced by `era` + `darkMode`. The `ThemeEditorPanel` is removed (custom themes don't fit the era model — can revisit later as "custom era" if needed).

---

## Implementation Phases

### Phase 1: Data Model & Defaults
- Refactor `defaults.ts`: restructure 17 `BUILT_IN_THEMES` into 7 `ERAS` with light/dark variants
- Add `era` + `darkMode` fields to `AppearanceSettings` type
- Add `getActiveTheme(era, darkMode, nounsSkin)` resolver function
- Update `applySettings.ts` to use new resolver instead of themeId lookup
- Write migration logic: old `themeId` → new `era + darkMode + nounsSkin.enabled`
- Update `settingsStore.ts`: new `DEFAULT_SETTINGS` shape

### Phase 2: Settings Shell & Navigation
- New `Settings.tsx` with responsive two-column / drill-down layout
- `CategoryNav` component with icons (sidebar on desktop, grid on mobile)
- Updated `SettingRow` and `SettingGroup` with card styling
- Move About to popover, Language to footer control
- 6 categories instead of 8

### Phase 3: Control Upgrades
- Custom `Select` dropdown (replaces all native `<select>`)
- `SegmentedControl` component (for font size, etc.)
- Improved `Toggle` with spring animation
- Improved `Slider` with progress fill
- Improved `ColorPicker` with larger swatches

### Phase 4: Appearance Panel
- Era card grid with 7 visual preview cards
- Dark mode toggle at top
- Nouns skin toggle + collapsible controls
- Accent color swatches row
- Display settings (font size, reduce motion, reduce transparency)

### Phase 5: Remaining Panels
- New `DesktopDockPanel` (merged Desktop + wallpaper from old Appearance)
- Update Windows, Notifications, Privacy, Accessibility panels with new controls
- Remove deprecated panels (DesktopPanel, LanguagePanel, AboutPanel, ThemeEditorPanel)

### Phase 6: Polish
- Keyboard navigation for all custom controls
- Transition animations between panels (slide for mobile drill-down)
- Focus management for accessibility
- Era-subtle token consumption (verify controls pick up `--berry-border-radius`, shadows, etc.)
- Test all 7 eras × dark/light × Nouns on/off combinations
